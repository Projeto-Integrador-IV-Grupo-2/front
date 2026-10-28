import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ConteudoFormulario } from '../components/conteudos/ConteudoFormulario.tsx'
import { formatarDuracao } from '../components/conteudos/vimeo.ts'
import { Paginacao } from '../components/areas/Paginacao.tsx'
import { usePermissao } from '../hooks/usePermissao.ts'
import { caminhoDocumento } from '../routes/paths.ts'
import { PERFIS_GESTAO_CONTEUDO } from '../routes/permissions.ts'
import { listarAreas } from '../services/areaService.ts'
import { listarCategorias } from '../services/categoriaService.ts'
import {
  atualizarConteudo,
  ConteudoServiceError,
  criarConteudo,
  listarConteudos,
  publicarConteudo,
} from '../services/conteudoService.ts'
import type { ApiFieldError } from '../types/api.ts'
import type { Pagina } from '../types/area.ts'
import {
  ROTULOS_STATUS_CONTEUDO,
  ROTULOS_TIPO_CONTEUDO,
  TIPOS_CONTEUDO,
  type Categoria,
  type Conteudo,
  type ConteudoFiltro,
  type ConteudoRequest,
  type StatusConteudo,
  type TipoConteudo,
} from '../types/conteudo.ts'
import type { RecursoResumo } from '../types/usuario.ts'
import styles from './Catalogo.module.css'

const TAMANHO_PAGINA = 12

interface ResultadoBusca {
  chave: string
  dados: Pagina<Conteudo> | null
  erro: string | null
}

function erroDe(causa: unknown, padrao: string): ConteudoServiceError {
  return causa instanceof ConteudoServiceError
    ? causa
    : new ConteudoServiceError(padrao)
}

/**
 * Catálogo de conteúdos (issue #39): filtros por título, categoria, área,
 * tipo e situação; cadastro, edição e publicação para ADMIN e GESTOR.
 * Colaborador vê só os publicados — a API já filtra, a tela só esconde as ações.
 */
export function ConteudosPage() {
  const podeGerenciar = usePermissao(PERFIS_GESTAO_CONTEUDO)

  const [tituloDigitado, setTituloDigitado] = useState('')
  const [filtro, setFiltro] = useState<ConteudoFiltro>({})
  const [pagina, setPagina] = useState(0)
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [areas, setAreas] = useState<RecursoResumo[]>([])

  const [aviso, setAviso] = useState<string | null>(null)
  const [erroOperacao, setErroOperacao] = useState<string | null>(null)
  const [publicando, setPublicando] = useState<string | null>(null)

  const [formularioAberto, setFormularioAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState<Conteudo | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])

  const chaveBusca = JSON.stringify([filtro, pagina, recarga])
  const carregando = resultado?.chave !== chaveBusca
  const dados = resultado?.chave === chaveBusca ? resultado.dados : null
  const erroBusca = resultado?.chave === chaveBusca ? resultado.erro : null

  useEffect(() => {
    const controlador = new AbortController()
    listarConteudos(
      filtro,
      { page: pagina, size: TAMANHO_PAGINA },
      { signal: controlador.signal },
    )
      .then((busca) => {
        if (!controlador.signal.aborted) {
          setResultado({ chave: chaveBusca, dados: busca, erro: null })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setResultado({
            chave: chaveBusca,
            dados: null,
            erro: erroDe(causa, 'Não foi possível carregar os conteúdos.')
              .message,
          })
        }
      })
    return () => controlador.abort()
  }, [chaveBusca, filtro, pagina])

  // Opções dos filtros e do formulário. Sem elas a tela continua útil: o
  // filtro só fica sem opções.
  useEffect(() => {
    let ativo = true
    listarCategorias({ size: 100 })
      .then((busca) => ativo && setCategorias(busca.content))
      .catch(() => undefined)
    listarAreas({}, { size: 100 })
      .then(
        (busca) =>
          ativo &&
          setAreas(busca.content.map(({ id, nome }) => ({ id, nome }))),
      )
      .catch(() => undefined)
    return () => {
      ativo = false
    }
  }, [])

  function alterarFiltro(parcial: Partial<ConteudoFiltro>) {
    setPagina(0)
    setFiltro((atual) => ({ ...atual, ...parcial }))
  }

  function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    alterarFiltro({ titulo: tituloDigitado.trim() })
  }

  function abrir(conteudo: Conteudo | null) {
    setEmEdicao(conteudo)
    setErroFormulario(null)
    setFieldErrors([])
    setFormularioAberto(true)
  }

  function fechar() {
    setFormularioAberto(false)
    setEmEdicao(null)
  }

  async function salvar(request: ConteudoRequest) {
    setSalvando(true)
    setErroFormulario(null)
    setFieldErrors([])
    try {
      if (emEdicao) {
        await atualizarConteudo(emEdicao.id, request)
        setAviso('Conteúdo atualizado.')
      } else {
        await criarConteudo(request)
        setAviso('Conteúdo cadastrado como rascunho.')
      }
      fechar()
      setRecarga((atual) => atual + 1)
    } catch (causa) {
      const erro = erroDe(causa, 'Não foi possível salvar o conteúdo.')
      // Erro de campo (ex.: link do Vimeo) aparece no próprio campo; o texto
      // geral só repete quando não há campo para apontar.
      setFieldErrors(erro.fieldErrors)
      setErroFormulario(erro.fieldErrors.length > 0 ? null : erro.message)
    } finally {
      setSalvando(false)
    }
  }

  async function publicar(conteudo: Conteudo) {
    setPublicando(conteudo.id)
    setErroOperacao(null)
    try {
      await publicarConteudo(conteudo.id)
      setAviso(`"${conteudo.titulo}" publicado.`)
      setRecarga((atual) => atual + 1)
    } catch (causa) {
      setErroOperacao(
        erroDe(causa, 'Não foi possível publicar o conteúdo.').message,
      )
    } finally {
      setPublicando(null)
    }
  }

  const conteudos = dados?.content ?? []

  return (
    <div className={styles.page}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Conteúdos</h1>
          <p className={styles.hint}>
            Material de estudo usado nas etapas das trilhas.
          </p>
        </div>
        {podeGerenciar && (
          <button
            type="button"
            className={styles.novo}
            onClick={() => abrir(null)}
          >
            + Novo conteúdo
          </button>
        )}
      </header>

      <div role="status" aria-live="polite" className={styles.avisoRegiao}>
        {aviso && <p className={styles.aviso}>{aviso}</p>}
      </div>

      {erroOperacao && (
        <p className={styles.erro} role="alert">
          {erroOperacao}
        </p>
      )}

      <form className={styles.filtros} onSubmit={buscar}>
        <label htmlFor="busca-conteudo" className="visually-hidden">
          Buscar conteúdo por título
        </label>
        <input
          id="busca-conteudo"
          type="search"
          placeholder="Buscar por título..."
          value={tituloDigitado}
          onChange={(event) => setTituloDigitado(event.target.value)}
        />
        <button type="submit">Buscar</button>

        <label htmlFor="filtro-categoria" className="visually-hidden">
          Categoria
        </label>
        <select
          id="filtro-categoria"
          value={filtro.categoriaId ?? ''}
          onChange={(event) =>
            alterarFiltro({ categoriaId: event.target.value })
          }
        >
          <option value="">Todas as categorias</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </select>

        <label htmlFor="filtro-area" className="visually-hidden">
          Área
        </label>
        <select
          id="filtro-area"
          value={filtro.areaId ?? ''}
          onChange={(event) => alterarFiltro({ areaId: event.target.value })}
        >
          <option value="">Todas as áreas</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.nome}
            </option>
          ))}
        </select>

        <label htmlFor="filtro-tipo" className="visually-hidden">
          Tipo
        </label>
        <select
          id="filtro-tipo"
          value={filtro.tipo ?? ''}
          onChange={(event) =>
            alterarFiltro({ tipo: event.target.value as TipoConteudo | '' })
          }
        >
          <option value="">Todos os tipos</option>
          {TIPOS_CONTEUDO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {ROTULOS_TIPO_CONTEUDO[tipo]}
            </option>
          ))}
        </select>

        {podeGerenciar && (
          <>
            <label htmlFor="filtro-status" className="visually-hidden">
              Situação
            </label>
            <select
              id="filtro-status"
              value={filtro.status ?? ''}
              onChange={(event) =>
                alterarFiltro({
                  status: event.target.value as StatusConteudo | '',
                })
              }
            >
              <option value="">Rascunhos e publicados</option>
              <option value="RASCUNHO">Só rascunhos</option>
              <option value="PUBLICADO">Só publicados</option>
            </select>
          </>
        )}
      </form>

      {carregando && (
        <p role="status" className={styles.estado}>
          Carregando conteúdos…
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

      {!carregando && !erroBusca && conteudos.length === 0 && (
        <p className={styles.estado}>Nenhum conteúdo encontrado.</p>
      )}

      {!carregando && !erroBusca && conteudos.length > 0 && (
        <>
          <ul className={styles.lista}>
            {conteudos.map((conteudo) => (
              <li key={conteudo.id} className={styles.cartao}>
                {conteudo.miniaturaUrl && (
                  <img
                    className={styles.miniatura}
                    src={conteudo.miniaturaUrl}
                    alt=""
                  />
                )}
                <h2>
                  {/* O detalhe abre qualquer tipo: texto, vídeo, link ou
                      documento com os arquivos. */}
                  <Link
                    className={styles.tituloLink}
                    to={caminhoDocumento(conteudo.id)}
                  >
                    {conteudo.titulo}
                  </Link>
                </h2>
                <div className={styles.meta}>
                  <span className={styles.selo}>
                    {ROTULOS_TIPO_CONTEUDO[conteudo.tipo]}
                  </span>
                  {podeGerenciar && (
                    <span
                      className={`${styles.selo} ${
                        conteudo.status === 'PUBLICADO'
                          ? styles.seloPublicado
                          : styles.seloRascunho
                      }`}
                    >
                      {ROTULOS_STATUS_CONTEUDO[conteudo.status]}
                    </span>
                  )}
                  {formatarDuracao(conteudo.duracaoSegundos) && (
                    <span>{formatarDuracao(conteudo.duracaoSegundos)}</span>
                  )}
                  {conteudo.categoria && <span>{conteudo.categoria.nome}</span>}
                  {conteudo.area && <span>{conteudo.area.nome}</span>}
                </div>
                {conteudo.descricao && (
                  <p className={styles.hint}>{conteudo.descricao}</p>
                )}
                {podeGerenciar && (
                  <div className={styles.acoesCartao}>
                    <button
                      type="button"
                      onClick={() => abrir(conteudo)}
                      aria-label={`Editar ${conteudo.titulo}`}
                    >
                      Editar
                    </button>
                    {conteudo.status === 'RASCUNHO' && (
                      <button
                        type="button"
                        className={styles.primaria}
                        onClick={() => void publicar(conteudo)}
                        disabled={publicando === conteudo.id}
                        aria-label={`Publicar ${conteudo.titulo}`}
                      >
                        {publicando === conteudo.id
                          ? 'Publicando…'
                          : 'Publicar'}
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Paginacao
            pagina={dados?.page.number ?? 0}
            totalPaginas={dados?.page.totalPages ?? 1}
            totalElementos={dados?.page.totalElements ?? 0}
            onIrPara={setPagina}
            desabilitado={carregando}
            item="conteúdo"
            itens="conteúdos"
          />
        </>
      )}

      {formularioAberto && (
        <ConteudoFormulario
          conteudo={emEdicao}
          categorias={categorias}
          areas={areas}
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
