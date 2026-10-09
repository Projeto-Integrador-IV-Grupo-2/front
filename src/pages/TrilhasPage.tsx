import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TrilhaCard } from '../components/trilhas/TrilhaCard.tsx'
import { TrilhaFormulario } from '../components/trilhas/TrilhaFormulario.tsx'
import {
  TrilhasFiltros,
  type ValoresFiltroTrilhas,
} from '../components/trilhas/TrilhasFiltros.tsx'
import { useAuth } from '../hooks/useAuth.ts'
import { usePermissao } from '../hooks/usePermissao.ts'
import { useValorAdiado } from '../hooks/useValorAdiado.ts'
import { PERFIS_CRIAR_TRILHA } from '../routes/permissions.ts'
import {
  criarTrilha,
  listarAreasParaTrilha,
  listarTrilhas,
  TrilhaServiceError,
} from '../services/trilhaService.ts'
import type { ApiFieldError } from '../types/api.ts'
import type {
  CriarTrilhaRequest,
  TrilhaFiltro,
  TrilhaPaginacao,
  TrilhaResumo,
} from '../types/trilha.ts'
import type { Pagina, RecursoResumo } from '../types/usuario.ts'
import styles from './TrilhasPage.module.css'

const TAMANHO_PAGINA = 12
const TAMANHO_RECOMENDADAS = 4
const CARTOES_ESQUELETO = 4

const FILTRO_VAZIO: ValoresFiltroTrilhas = { nome: '', areaId: '', status: '' }

type Aba = 'minhas' | 'catalogo'

const ABAS: Array<{ id: Aba; rotulo: string }> = [
  { id: 'minhas', rotulo: 'Minhas trilhas' },
  { id: 'catalogo', rotulo: 'Catálogo' },
]

/** Parâmetro da URL que guarda a aba — recarregar a página mantém a escolha. */
const PARAMETRO_ABA = 'aba'

function abaDaUrl(valor: string | null): Aba {
  return valor === 'catalogo' ? 'catalogo' : 'minhas'
}

interface ResultadoBusca {
  /** Identifica a busca que produziu este resultado (aba + filtros + recarga). */
  chave: string
  paginas: Pagina<TrilhaResumo>[]
  erro: string | null
}

interface ResultadoRecomendadas {
  chave: string
  trilhas: TrilhaResumo[]
  erro: string | null
}

/**
 * Filtro enviado à API. "Minhas trilhas" usa `minhas=true`; no catálogo, quem
 * tem área recebe as trilhas dela primeiro (`recomendar=AREA`).
 */
function filtroDaBusca(
  aba: Aba,
  nome: string,
  areaId: string,
  status: TrilhaFiltro['status'],
  recomendarArea: boolean,
): TrilhaFiltro {
  return {
    nome,
    areaId,
    status,
    minhas: aba === 'minhas',
    recomendar: recomendarArea ? 'AREA' : undefined,
  }
}

/** Nas minhas trilhas, o prazo mais próximo primeiro; no catálogo, por nome. */
function ordenacaoDa(aba: Aba): TrilhaPaginacao['sort'] {
  return aba === 'minhas' ? 'prazo' : 'nome'
}

function mensagemDe(causa: unknown, padrao: string): string {
  return causa instanceof TrilhaServiceError ? causa.message : padrao
}

/**
 * Trilhas do tenant em duas abas — "Minhas trilhas" (as que a pessoa iniciou
 * ou recebeu, por prazo) e "Catálogo" (todas) — com busca, filtros de área e
 * status, recomendações da área do usuário e cadastro de nova trilha.
 *
 * A página é a dona da comunicação com a API: cartões, filtros e formulário
 * só apresentam e avisam a intenção. A listagem cresce com "Carregar mais";
 * qualquer mudança de aba ou filtro recomeça da primeira página.
 */
export function TrilhasPage() {
  const { user } = useAuth()
  const podeCriar = usePermissao(PERFIS_CRIAR_TRILHA)
  const areaDoUsuario = user?.area ?? null

  const [searchParams, setSearchParams] = useSearchParams()
  const aba = abaDaUrl(searchParams.get(PARAMETRO_ABA))

  const [filtros, setFiltros] = useState<ValoresFiltroTrilhas>(FILTRO_VAZIO)
  // Só o nome é adiado: os selects não geram uma requisição por tecla.
  const nomeBuscado = useValorAdiado(filtros.nome.trim())

  // Contador de recarga: "Tentar novamente" e o cadastro incrementam para
  // refazer a busca do início.
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroMais, setErroMais] = useState<string | null>(null)
  const [recomendadas, setRecomendadas] =
    useState<ResultadoRecomendadas | null>(null)

  const [formularioAberto, setFormularioAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])
  const [areas, setAreas] = useState<RecursoResumo[] | null>(null)
  const [areasIndisponiveis, setAreasIndisponiveis] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const novaTrilhaRef = useRef<HTMLButtonElement>(null)
  const abasRef = useRef<Array<HTMLButtonElement | null>>([])

  const { areaId, status } = filtros
  const recomendarArea = aba === 'catalogo' && areaDoUsuario !== null
  const filtroApi = filtroDaBusca(
    aba,
    nomeBuscado,
    areaId,
    status,
    recomendarArea,
  )
  const ordenacao = ordenacaoDa(aba)
  const chaveBusca = JSON.stringify([filtroApi, ordenacao, recarga])

  // `carregando` é derivado do resultado em mãos, como em UsuariosPage: evita
  // acender o indicador por setState dentro do efeito.
  const carregando = resultado?.chave !== chaveBusca
  const erroBusca = resultado?.chave === chaveBusca ? resultado.erro : null
  const paginas = resultado?.chave === chaveBusca ? resultado.paginas : []

  useEffect(() => {
    const controlador = new AbortController()

    listarTrilhas(
      filtroDaBusca(aba, nomeBuscado, areaId, status, recomendarArea),
      { page: 0, size: TAMANHO_PAGINA, sort: ordenacaoDa(aba) },
      { signal: controlador.signal },
    )
      .then((pagina) => {
        if (!controlador.signal.aborted) {
          setResultado({ chave: chaveBusca, paginas: [pagina], erro: null })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setResultado({
            chave: chaveBusca,
            paginas: [],
            erro: mensagemDe(causa, 'Não foi possível carregar as trilhas.'),
          })
        }
      })

    return () => controlador.abort()
  }, [chaveBusca, aba, nomeBuscado, areaId, status, recomendarArea])

  // Recomendadas: só no catálogo e só para quem tem área.
  const chaveRecomendadas =
    aba === 'catalogo' && areaDoUsuario ? areaDoUsuario.id : null
  useEffect(() => {
    if (chaveRecomendadas === null) {
      return
    }
    const controlador = new AbortController()
    listarTrilhas(
      { areaId: chaveRecomendadas },
      { page: 0, size: TAMANHO_RECOMENDADAS },
      { signal: controlador.signal },
    )
      .then((pagina) => {
        if (!controlador.signal.aborted) {
          setRecomendadas({
            chave: chaveRecomendadas,
            trilhas: pagina.content,
            erro: null,
          })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setRecomendadas({
            chave: chaveRecomendadas,
            trilhas: [],
            erro: mensagemDe(
              causa,
              'Não foi possível carregar as recomendações.',
            ),
          })
        }
      })
    return () => controlador.abort()
  }, [chaveRecomendadas])

  // As áreas alimentam o filtro e o cadastro; falha aqui só esconde o filtro.
  useEffect(() => {
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
  }, [])

  const trilhas = paginas.flatMap((pagina) => pagina.content)
  const ultimaPagina = paginas[paginas.length - 1]
  const temMais =
    ultimaPagina !== undefined &&
    ultimaPagina.page.number < ultimaPagina.page.totalPages - 1
  const total = ultimaPagina?.page.totalElements ?? 0
  const temFiltro =
    filtros.nome.trim() !== '' || filtros.areaId !== '' || filtros.status !== ''

  function trocarAba(nova: Aba) {
    if (nova === aba) {
      return
    }
    setErroMais(null)
    setSearchParams(
      (atuais) => {
        const proximos = new URLSearchParams(atuais)
        proximos.set(PARAMETRO_ABA, nova)
        return proximos
      },
      { replace: true },
    )
  }

  // Setas trocam de aba, como pede o padrão de abas do WAI-ARIA.
  function aoTeclarAba(
    evento: KeyboardEvent<HTMLButtonElement>,
    indice: number,
  ) {
    const passo =
      evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowLeft' ? -1 : 0
    if (passo === 0) {
      return
    }
    evento.preventDefault()
    const proximo = (indice + passo + ABAS.length) % ABAS.length
    trocarAba(ABAS[proximo].id)
    abasRef.current[proximo]?.focus()
  }

  function alterarFiltros(valores: ValoresFiltroTrilhas) {
    setErroMais(null)
    setFiltros(valores)
  }

  function recarregar() {
    setErroMais(null)
    setRecarga((atual) => atual + 1)
  }

  async function carregarMais() {
    if (!ultimaPagina || carregandoMais) {
      return
    }
    const chave = chaveBusca
    setCarregandoMais(true)
    setErroMais(null)
    try {
      const proxima = await listarTrilhas(filtroApi, {
        page: ultimaPagina.page.number + 1,
        size: TAMANHO_PAGINA,
        sort: ordenacao,
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
  const recomendadasAtuais =
    chaveRecomendadas !== null && recomendadas?.chave === chaveRecomendadas
      ? recomendadas
      : null

  return (
    <div className={styles.page}>
      <header className={styles.cabecalho}>
        <div>
          <h1 className={styles.titulo}>Trilhas</h1>
          <p className={styles.hint}>
            {podeCriar
              ? 'Acompanhe a criação e a execução das trilhas de desenvolvimento.'
              : 'As trilhas de desenvolvimento disponíveis para você.'}
          </p>
        </div>
        {podeCriar && (
          <button
            ref={novaTrilhaRef}
            type="button"
            className={styles.nova}
            onClick={abrirFormulario}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
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
      </header>

      {/* Live region única da página: o aviso de sucesso chega ao leitor de
          tela sem tirar o foco de onde está. */}
      <div role="status" aria-live="polite" className={styles.avisoRegiao}>
        {aviso && <p className={styles.aviso}>{aviso}</p>}
      </div>

      <div
        className={styles.abas}
        role="tablist"
        aria-label="Visões das trilhas"
      >
        {ABAS.map((item, indice) => {
          const ativa = item.id === aba
          return (
            <button
              key={item.id}
              ref={(elemento) => {
                abasRef.current[indice] = elemento
              }}
              type="button"
              role="tab"
              id={`aba-${item.id}`}
              aria-selected={ativa}
              aria-controls="painel-trilhas"
              tabIndex={ativa ? 0 : -1}
              className={
                ativa ? `${styles.aba} ${styles.abaAtiva}` : styles.aba
              }
              onClick={() => trocarAba(item.id)}
              onKeyDown={(evento) => aoTeclarAba(evento, indice)}
            >
              {item.rotulo}
            </button>
          )
        })}
      </div>

      <div
        id="painel-trilhas"
        role="tabpanel"
        aria-labelledby={`aba-${aba}`}
        className={styles.painel}
      >
        {recomendadasAtuais && areaDoUsuario && (
          <SecaoRecomendadas
            area={areaDoUsuario}
            trilhas={recomendadasAtuais.trilhas}
            erro={recomendadasAtuais.erro}
          />
        )}

        <TrilhasFiltros
          valores={filtros}
          onChange={alterarFiltros}
          onLimpar={() => alterarFiltros(FILTRO_VAZIO)}
          areas={areas}
        />

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
          <EstadoVazio
            aba={aba}
            temFiltro={temFiltro}
            podeCriar={podeCriar}
            onVerCatalogo={() => trocarAba('catalogo')}
          />
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
      </div>

      {formularioAberto && (
        <TrilhaFormulario
          areas={areas ?? []}
          areasIndisponiveis={areasIndisponiveis}
          salvando={salvando}
          erro={erroFormulario}
          fieldErrors={fieldErrors}
          onSalvar={(request) => void cadastrar(request)}
          onFechar={fecharFormulario}
        />
      )}
    </div>
  )
}

interface SecaoRecomendadasProps {
  area: RecursoResumo
  trilhas: TrilhaResumo[]
  erro: string | null
}

/** Trilhas da área do usuário. Sem nada a recomendar, a seção não aparece. */
function SecaoRecomendadas({ area, trilhas, erro }: SecaoRecomendadasProps) {
  if (erro === null && trilhas.length === 0) {
    return null
  }
  return (
    <section
      className={styles.recomendadas}
      aria-labelledby="titulo-recomendadas"
    >
      <div>
        <h2 id="titulo-recomendadas" className={styles.subtitulo}>
          Recomendadas para sua área
        </h2>
        <p className={styles.hint}>Trilhas da área {area.nome}.</p>
      </div>
      {erro ? (
        <p className={styles.erroMais}>{erro}</p>
      ) : (
        <ul className={styles.grade} aria-label="Recomendadas para sua área">
          {trilhas.map((trilha) => (
            <TrilhaCard key={trilha.id} trilha={trilha} />
          ))}
        </ul>
      )}
    </section>
  )
}

interface EstadoVazioProps {
  aba: Aba
  temFiltro: boolean
  podeCriar: boolean
  onVerCatalogo: () => void
}

function EstadoVazio({
  aba,
  temFiltro,
  podeCriar,
  onVerCatalogo,
}: EstadoVazioProps) {
  let titulo: string
  let texto: string
  if (temFiltro) {
    titulo = 'Nenhuma trilha encontrada'
    texto = 'Nenhuma trilha combina com a busca e os filtros atuais.'
  } else if (aba === 'minhas') {
    titulo = 'Você ainda não tem trilhas'
    texto =
      'As trilhas que você iniciar ou receber aparecem aqui, ordenadas pelo prazo.'
  } else if (podeCriar) {
    titulo = 'Nenhuma trilha cadastrada ainda'
    texto =
      'Crie a primeira trilha para organizar o desenvolvimento das equipes.'
  } else {
    titulo = 'Nenhuma trilha disponível no momento'
    texto = 'Quando uma trilha for liberada para você, ela aparece aqui.'
  }

  return (
    <div className={styles.vazio}>
      <TrilhaVaziaIcone />
      <p className={styles.vazioTitulo}>{titulo}</p>
      <p className={styles.vazioTexto}>{texto}</p>
      {!temFiltro && aba === 'minhas' && (
        <button type="button" className={styles.mais} onClick={onVerCatalogo}>
          Ver catálogo
        </button>
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
