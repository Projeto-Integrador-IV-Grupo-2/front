import { useEffect, useState } from 'react'
import { CategoriaFormulario } from '../components/conteudos/CategoriaFormulario.tsx'
import { usePermissao } from '../hooks/usePermissao.ts'
import { PERFIS_GESTAO_CONTEUDO } from '../routes/permissions.ts'
import {
  atualizarCategoria,
  CategoriaServiceError,
  criarCategoria,
  listarCategorias,
} from '../services/categoriaService.ts'
import type { ApiFieldError } from '../types/api.ts'
import type { Categoria, CategoriaRequest } from '../types/conteudo.ts'
import styles from './Catalogo.module.css'

interface ResultadoBusca {
  chave: number
  categorias: Categoria[] | null
  erro: string | null
}

/**
 * Categorias de conteúdo (issue #39). A lista é de todos; criar e editar só
 * aparecem para quem tem `PERFIS_GESTAO_CONTEUDO`. Todo acesso à API passa
 * pelo `categoriaService`.
 */
export function CategoriasPage() {
  const podeGerenciar = usePermissao(PERFIS_GESTAO_CONTEUDO)
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const [formularioAberto, setFormularioAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState<Categoria | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])

  const carregando = resultado?.chave !== recarga
  const categorias = resultado?.chave === recarga ? resultado.categorias : null
  const erroBusca = resultado?.chave === recarga ? resultado.erro : null

  useEffect(() => {
    const controlador = new AbortController()
    listarCategorias({ size: 100 }, { signal: controlador.signal })
      .then((pagina) => {
        if (!controlador.signal.aborted) {
          setResultado({
            chave: recarga,
            categorias: pagina.content,
            erro: null,
          })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setResultado({
            chave: recarga,
            categorias: null,
            erro:
              causa instanceof CategoriaServiceError
                ? causa.message
                : 'Não foi possível carregar as categorias.',
          })
        }
      })
    return () => controlador.abort()
  }, [recarga])

  function abrir(categoria: Categoria | null) {
    setEmEdicao(categoria)
    setErroFormulario(null)
    setFieldErrors([])
    setFormularioAberto(true)
  }

  function fechar() {
    setFormularioAberto(false)
    setEmEdicao(null)
  }

  async function salvar(request: CategoriaRequest) {
    setSalvando(true)
    setErroFormulario(null)
    setFieldErrors([])
    try {
      if (emEdicao) {
        await atualizarCategoria(emEdicao.id, request)
        setAviso('Categoria atualizada.')
      } else {
        await criarCategoria(request)
        setAviso('Categoria cadastrada.')
      }
      fechar()
      setRecarga((atual) => atual + 1)
    } catch (causa) {
      const erro =
        causa instanceof CategoriaServiceError
          ? causa
          : new CategoriaServiceError('Não foi possível salvar a categoria.')
      setErroFormulario(erro.message)
      setFieldErrors(erro.fieldErrors)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Categorias</h1>
          <p className={styles.hint}>Agrupam os conteúdos de estudo.</p>
        </div>
        {podeGerenciar && (
          <button
            type="button"
            className={styles.novo}
            onClick={() => abrir(null)}
          >
            + Nova categoria
          </button>
        )}
      </header>

      <div role="status" aria-live="polite" className={styles.avisoRegiao}>
        {aviso && <p className={styles.aviso}>{aviso}</p>}
      </div>

      {carregando && (
        <p role="status" className={styles.estado}>
          Carregando categorias…
        </p>
      )}

      {erroBusca && (
        <div className={styles.erro} role="alert">
          <p>{erroBusca}</p>
          <button
            type="button"
            onClick={() => setRecarga((atual) => atual + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {categorias && categorias.length === 0 && (
        <p className={styles.estado}>Nenhuma categoria cadastrada.</p>
      )}

      {categorias && categorias.length > 0 && (
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Descrição</th>
              {podeGerenciar && <th scope="col">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {categorias.map((categoria) => (
              <tr key={categoria.id}>
                <td>{categoria.nome}</td>
                <td>{categoria.descricao ?? '—'}</td>
                {podeGerenciar && (
                  <td>
                    <button
                      type="button"
                      onClick={() => abrir(categoria)}
                      aria-label={`Editar ${categoria.nome}`}
                    >
                      Editar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {formularioAberto && (
        <CategoriaFormulario
          categoria={emEdicao}
          salvando={salvando}
          erro={erroFormulario}
          fieldErrors={fieldErrors}
          onSalvar={(request) => void salvar(request)}
          onFechar={fechar}
        />
      )}
    </div>
  )
}
