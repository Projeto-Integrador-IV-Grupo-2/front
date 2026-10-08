import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrilhaCard } from '../components/trilhas/TrilhaCard.tsx'
import { TrilhaFormulario } from '../components/trilhas/TrilhaFormulario.tsx'
import { useAuth } from '../hooks/useAuth.ts'
import { ROTAS } from '../routes/paths.ts'
import {
  PERFIS_CRIAR_TRILHA,
  PERFIS_GESTAO_PDI,
  temPermissao,
} from '../routes/permissions.ts'
import {
  criarTrilha,
  listarAreasParaTrilha,
  listarTrilhas,
  TrilhaServiceError,
} from '../services/trilhaService.ts'
import type { ApiFieldError } from '../types/api.ts'
import type { CriarTrilhaRequest, TrilhaResumo } from '../types/trilha.ts'
import type { Pagina, RecursoResumo } from '../types/usuario.ts'
import styles from './TrilhasPage.module.css'

const TAMANHO_PAGINA = 12
const CARTOES_ESQUELETO = 4

interface ResultadoBusca {
  /** Identifica a busca que produziu este resultado (recarga). */
  chave: number
  paginas: Pagina<TrilhaResumo>[]
  erro: string | null
}

function mensagemDe(causa: unknown, padrao: string): string {
  return causa instanceof TrilhaServiceError ? causa.message : padrao
}

/**
 * Listagem de trilhas do tenant (Card 12) e cadastro de nova trilha.
 *
 * A página é a dona da comunicação com a API: cartões e formulário só
 * apresentam e avisam a intenção. A listagem cresce com "Carregar mais" em vez
 * de páginas numeradas — em grade de cartões é o que se espera, e a posição de
 * rolagem não se perde ao pedir mais.
 */
export function TrilhasPage() {
  const { user } = useAuth()
  const podeCriar = temPermissao(PERFIS_CRIAR_TRILHA, user?.papel)
  const gerePdi = temPermissao(PERFIS_GESTAO_PDI, user?.papel)

  // Contador de recarga: "Tentar novamente" e o cadastro incrementam para
  // refazer a busca do início.
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroMais, setErroMais] = useState<string | null>(null)

  const [formularioAberto, setFormularioAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])
  const [areas, setAreas] = useState<RecursoResumo[] | null>(null)
  const [areasIndisponiveis, setAreasIndisponiveis] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const novaTrilhaRef = useRef<HTMLButtonElement>(null)

  // `carregando` é derivado do resultado em mãos, como em UsuariosPage: evita
  // acender o indicador por setState dentro do efeito.
  const carregando = resultado?.chave !== recarga
  const erroBusca = resultado?.chave === recarga ? resultado.erro : null
  const paginas = resultado?.chave === recarga ? resultado.paginas : []

  useEffect(() => {
    const controlador = new AbortController()

    listarTrilhas(
      { page: 0, size: TAMANHO_PAGINA },
      { signal: controlador.signal },
    )
      .then((pagina) => {
        if (!controlador.signal.aborted) {
          setResultado({ chave: recarga, paginas: [pagina], erro: null })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setResultado({
            chave: recarga,
            paginas: [],
            erro: mensagemDe(causa, 'Não foi possível carregar as trilhas.'),
          })
        }
      })

    return () => controlador.abort()
  }, [recarga])

  // As áreas só são buscadas na primeira vez que o formulário abre.
  useEffect(() => {
    if (!formularioAberto || areas !== null) {
      return
    }
    let ativo = true
    listarAreasParaTrilha()
      .then((lista) => {
        if (ativo) {
          setAreas(lista)
        }
      })
      .catch(() => {
        if (ativo) {
          setAreas([])
          setAreasIndisponiveis(true)
        }
      })
    return () => {
      ativo = false
    }
  }, [formularioAberto, areas])

  const trilhas = paginas.flatMap((pagina) => pagina.content)
  const ultimaPagina = paginas[paginas.length - 1]
  const temMais =
    ultimaPagina !== undefined &&
    ultimaPagina.page.number < ultimaPagina.page.totalPages - 1
  const total = ultimaPagina?.page.totalElements ?? 0

  function recarregar() {
    setErroMais(null)
    setRecarga((atual) => atual + 1)
  }

  async function carregarMais() {
    if (!ultimaPagina || carregandoMais) {
      return
    }
    const chave = recarga
    setCarregandoMais(true)
    setErroMais(null)
    try {
      const proxima = await listarTrilhas({
        page: ultimaPagina.page.number + 1,
        size: TAMANHO_PAGINA,
      })
      setResultado((atual) =>
        atual && atual.chave === chave
          ? { ...atual, paginas: [...atual.paginas, proxima] }
          : atual,
      )
    } catch (causa) {
      setErroMais(mensagemDe(causa, 'Não foi possível carregar mais trilhas.'))
    } finally {
      setCarregandoMais(false)
    }
  }

  function abrirFormulario() {
    setErroFormulario(null)
    setFieldErrors([])
    setAviso(null)
    setFormularioAberto(true)
  }

  function fecharFormulario() {
    setFormularioAberto(false)
    setErroFormulario(null)
    setFieldErrors([])
    // Sem isso o foco cairia no <body> quando o diálogo some.
    novaTrilhaRef.current?.focus()
  }

  async function cadastrar(request: CriarTrilhaRequest) {
    setSalvando(true)
    setErroFormulario(null)
    setFieldErrors([])
    try {
      await criarTrilha(request)
      fecharFormulario()
      setAviso(`Trilha “${request.nome}” criada.`)
      recarregar()
    } catch (causa) {
      if (causa instanceof TrilhaServiceError) {
        setErroFormulario(causa.message)
        setFieldErrors(causa.fieldErrors)
      } else {
        setErroFormulario('Não foi possível criar a trilha.')
      }
    } finally {
      setSalvando(false)
    }
  }

  const listaVazia = !carregando && erroBusca === null && trilhas.length === 0

  return (
    <div className={styles.page}>
      <header className={styles.cabecalho}>
        <div>
          <h1 className={styles.titulo}>
            {podeCriar ? 'Trilhas' : 'Minhas trilhas'}
          </h1>
          <p className={styles.hint}>
            {podeCriar
              ? 'Acompanhe a criação e a execução das trilhas de desenvolvimento.'
              : 'As trilhas de desenvolvimento disponíveis para você.'}
          </p>
        </div>
        <div className={styles.acoesCabecalho}>
          {/* O PDI vive dentro de Trilhas: sem item no menu, entra por aqui.
              Quando as abas da Task 6 chegarem em dev, vira mais uma aba. */}
          <Link to={ROTAS.pdi} className={styles.linkPdi}>
            {gerePdi ? 'PDI' : 'Meu PDI'}
          </Link>
          {podeCriar && (
            <button
              ref={novaTrilhaRef}
              type="button"
              className={styles.nova}
              onClick={abrirFormulario}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                aria-hidden="true"
              >
                <path
                  d="M7 2v10M2 7h10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              Nova trilha
            </button>
          )}
        </div>
      </header>

      {/* Live region única da página: o aviso de sucesso chega ao leitor de
          tela sem tirar o foco de onde está. */}
      <div role="status" aria-live="polite" className={styles.avisoRegiao}>
        {aviso && <p className={styles.aviso}>{aviso}</p>}
      </div>

      {carregando && (
        <div aria-busy="true">
          <p role="status" className="visually-hidden">
            Carregando trilhas…
          </p>
          <ul className={styles.grade} aria-hidden="true">
            {Array.from({ length: CARTOES_ESQUELETO }, (_, indice) => (
              <li key={indice} className={styles.esqueleto}>
                <span className={styles.esqSelo} />
                <span className={styles.esqTitulo} />
                <span className={styles.esqTexto} />
                <span className={styles.esqTexto} />
                <span className={styles.esqBarra} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {erroBusca && (
        <div className={styles.erro} role="alert">
          <p>{erroBusca}</p>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {listaVazia && (
        <div className={styles.vazio}>
          <TrilhaVaziaIcone />
          <p className={styles.vazioTitulo}>
            {podeCriar
              ? 'Nenhuma trilha cadastrada ainda'
              : 'Nenhuma trilha disponível no momento'}
          </p>
          <p className={styles.vazioTexto}>
            {podeCriar
              ? 'Crie a primeira trilha para organizar o desenvolvimento das equipes.'
              : 'Quando uma trilha for liberada para você, ela aparece aqui.'}
          </p>
        </div>
      )}

      {!carregando && erroBusca === null && trilhas.length > 0 && (
        <>
          <ul className={styles.grade} aria-label="Trilhas">
            {trilhas.map((trilha) => (
              <TrilhaCard key={trilha.id} trilha={trilha} />
            ))}
          </ul>

          <div className={styles.rodape}>
            <p className={styles.contagem}>
              {trilhas.length} de {total} {total === 1 ? 'trilha' : 'trilhas'}
            </p>
            {erroMais && (
              <p className={styles.erroMais} role="alert">
                {erroMais}
              </p>
            )}
            {temMais && (
              <button
                type="button"
                className={styles.mais}
                onClick={() => void carregarMais()}
                disabled={carregandoMais}
              >
                {carregandoMais ? 'Carregando…' : 'Carregar mais trilhas'}
              </button>
            )}
          </div>
        </>
      )}

      {formularioAberto && (
        <TrilhaFormulario
          areas={areas ?? []}
          areasIndisponiveis={areasIndisponiveis}
          salvando={salvando}
          erro={erroFormulario}
          fieldErrors={fieldErrors}
          onCriar={(request) => void cadastrar(request)}
          onFechar={fecharFormulario}
        />
      )}
    </div>
  )
}

function TrilhaVaziaIcone() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="6" cy="18" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="18" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 7l8 4M8 17l8-4" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
