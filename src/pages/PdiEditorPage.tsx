import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AdicionarCompetenciaForm } from '../components/pdi/AdicionarCompetenciaForm.tsx'
import { CompetenciaFormulario } from '../components/pdi/CompetenciaFormulario.tsx'
import { CompetenciaPdi } from '../components/pdi/CompetenciaPdi.tsx'
import { LigarTrilhaForm } from '../components/pdi/LigarTrilhaForm.tsx'
import { PdiResumoPainel } from '../components/pdi/PdiResumoPainel.tsx'
import estados from '../components/pdi/Estados.module.css'
import { ROTAS } from '../routes/paths.ts'
import {
  criarCompetencia,
  CompetenciaServiceError,
  listarCompetencias,
} from '../services/competenciaService.ts'
import {
  adicionarCompetencia,
  buscarPdi,
  ligarTrilha,
  PdiServiceError,
} from '../services/pdiService.ts'
import { listarTrilhas } from '../services/trilhaService.ts'
import type { ApiFieldError } from '../types/api.ts'
import type { Competencia, CompetenciaRequest } from '../types/competencia.ts'
import type {
  LigarTrilhaRequest,
  PdiDetalhe,
  PdiItemRequest,
} from '../types/pdi.ts'
import type { RecursoResumo } from '../types/usuario.ts'
import styles from './PdiEditorPage.module.css'

interface ResultadoBusca {
  chave: string
  pdi: PdiDetalhe | null
  erro: PdiServiceError | null
}

interface ErroFormulario {
  mensagem: string
  fieldErrors: ApiFieldError[]
}

function erroDe(causa: unknown, padrao: string): ErroFormulario {
  if (
    causa instanceof PdiServiceError ||
    causa instanceof CompetenciaServiceError
  ) {
    return { mensagem: causa.message, fieldErrors: causa.fieldErrors }
  }
  return { mensagem: padrao, fieldErrors: [] }
}

/**
 * Editor do PDI (`/trilhas/pdi/:id`, ADMIN e GESTOR): competências com nível
 * de 1 a 5 e observação e, em cada competência, as trilhas ligadas com prazo.
 * A competência que não existe pode ser criada aqui mesmo, num diálogo.
 *
 * Como no detalhe da trilha, depois de cada gravação a tela busca o PDI de
 * novo e mostra o que a API devolveu (inclusive o percentual).
 */
export function PdiEditorPage() {
  const { id = '' } = useParams()
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)
  const [competencias, setCompetencias] = useState<Competencia[]>([])
  const [trilhas, setTrilhas] = useState<RecursoResumo[]>([])
  const [erroOpcoes, setErroOpcoes] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const [competenciaSelecionada, setCompetenciaSelecionada] = useState('')
  const [salvandoItem, setSalvandoItem] = useState(false)
  const [erroItem, setErroItem] = useState<ErroFormulario | null>(null)
  // Remonta o formulário depois de adicionar, para ele voltar limpo.
  const [versaoFormItem, setVersaoFormItem] = useState(0)

  const [ligandoItemId, setLigandoItemId] = useState<string | null>(null)
  const [errosLigar, setErrosLigar] = useState<Record<string, ErroFormulario>>(
    {},
  )
  const [versoesLigar, setVersoesLigar] = useState<Record<string, number>>({})

  const [dialogoAberto, setDialogoAberto] = useState(false)
  const [salvandoCompetencia, setSalvandoCompetencia] = useState(false)
  const [erroCompetencia, setErroCompetencia] = useState<ErroFormulario | null>(
    null,
  )
  const tituloRef = useRef<HTMLHeadingElement>(null)

  const chaveBusca = `${id}:${recarga}`
  const carregando = resultado?.chave !== chaveBusca
  const pdi = resultado?.chave === chaveBusca ? resultado.pdi : null
  const erroBusca = resultado?.chave === chaveBusca ? resultado.erro : null

  useEffect(() => {
    const controlador = new AbortController()
    buscarPdi(id, { signal: controlador.signal })
      .then((detalhe) => {
        if (!controlador.signal.aborted) {
          setResultado({ chave: chaveBusca, pdi: detalhe, erro: null })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setResultado({
            chave: chaveBusca,
            pdi: null,
            erro:
              causa instanceof PdiServiceError
                ? causa
                : new PdiServiceError('Não foi possível carregar o PDI.'),
          })
        }
      })
    return () => controlador.abort()
  }, [id, chaveBusca])

  // Opções dos selects: competências ativas e trilhas do tenant.
  useEffect(() => {
    const controlador = new AbortController()
    Promise.all([
      listarCompetencias({ signal: controlador.signal }),
      listarTrilhas({ page: 0, size: 100 }, { signal: controlador.signal }),
    ])
      .then(([listaCompetencias, paginaTrilhas]) => {
        if (!controlador.signal.aborted) {
          setCompetencias(listaCompetencias)
          setTrilhas(
            paginaTrilhas.content.map(({ id: trilhaId, nome }) => ({
              id: trilhaId,
              nome,
            })),
          )
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setErroOpcoes(
            erroDe(causa, 'Não foi possível carregar competências e trilhas.')
              .mensagem,
          )
        }
      })
    return () => controlador.abort()
  }, [])

  const idCarregado = pdi?.id
  useEffect(() => {
    if (idCarregado) {
      tituloRef.current?.focus()
    }
  }, [idCarregado])

  /** Busca o PDI de novo sem passar pelo carregamento: a tela não pisca. */
  async function revalidar(pdiId: string) {
    const atualizado = await buscarPdi(pdiId)
    setResultado({ chave: chaveBusca, pdi: atualizado, erro: null })
  }

  async function adicionarItem(request: PdiItemRequest) {
    if (!pdi) {
      return
    }
    setSalvandoItem(true)
    setErroItem(null)
    setAviso(null)
    try {
      await adicionarCompetencia(pdi.id, request)
      await revalidar(pdi.id)
      const nome = competencias.find(
        (c) => c.id === request.competenciaId,
      )?.nome
      setCompetenciaSelecionada('')
      setVersaoFormItem((n) => n + 1)
      setAviso(`Competência “${nome ?? ''}” adicionada.`)
    } catch (causa) {
      setErroItem(erroDe(causa, 'Não foi possível adicionar a competência.'))
    } finally {
      setSalvandoItem(false)
    }
  }

  async function ligar(itemId: string, request: LigarTrilhaRequest) {
    if (!pdi) {
      return
    }
    setLigandoItemId(itemId)
    setErrosLigar(({ [itemId]: _removido, ...resto }) => resto)
    setAviso(null)
    try {
      await ligarTrilha(pdi.id, itemId, request)
      await revalidar(pdi.id)
      setVersoesLigar((atual) => ({
        ...atual,
        [itemId]: (atual[itemId] ?? 0) + 1,
      }))
      const nome = trilhas.find((t) => t.id === request.trilhaId)?.nome
      setAviso(
        `Trilha “${nome ?? ''}” ligada e atribuída a ${pdi.colaborador.nomeCompleto}.`,
      )
    } catch (causa) {
      setErrosLigar((atual) => ({
        ...atual,
        [itemId]: erroDe(causa, 'Não foi possível ligar a trilha ao PDI.'),
      }))
    } finally {
      setLigandoItemId(null)
    }
  }

  async function cadastrarCompetencia(request: CompetenciaRequest) {
    setSalvandoCompetencia(true)
    setErroCompetencia(null)
    try {
      const nova = await criarCompetencia(request)
      setCompetencias((atual) =>
        [...atual, nova].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      )
      setCompetenciaSelecionada(nova.id)
      setDialogoAberto(false)
      setAviso(
        `Competência “${nova.nome}” criada. Defina os níveis para adicioná-la.`,
      )
    } catch (causa) {
      setErroCompetencia(erroDe(causa, 'Não foi possível criar a competência.'))
    } finally {
      setSalvandoCompetencia(false)
    }
  }

  const noPdi = new Set(pdi?.itens.map((item) => item.competencia.id))
  const disponiveis = competencias.filter((c) => !noPdi.has(c.id))

  return (
    <div className={styles.page}>
      <Link to={`${ROTAS.pdi}?aba=equipe`} className={styles.voltar}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path
            d="M8.5 3L4.5 7l4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Voltar para PDIs da equipe
      </Link>

      {carregando && (
        <p role="status" className={estados.carregando}>
          Carregando PDI…
        </p>
      )}

      {erroBusca && (
        <div className={estados.erro} role="alert">
          <p>{erroBusca.message}</p>
          {erroBusca.status !== 404 && (
            <button type="button" onClick={() => setRecarga((n) => n + 1)}>
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {pdi && (
        <>
          <header>
            <h1 ref={tituloRef} tabIndex={-1} className={styles.titulo}>
              PDI de {pdi.colaborador.nomeCompleto}
            </h1>
            <p className={styles.hint}>
              Defina as competências e ligue a cada uma as trilhas que o
              colaborador deve fazer.
            </p>
          </header>

          <div role="status" aria-live="polite" className={estados.avisoRegiao}>
            {aviso && <p className={estados.aviso}>{aviso}</p>}
          </div>

          <PdiResumoPainel pdi={pdi} mostrar="colaborador" />

          {erroOpcoes && (
            <p className={estados.erro} role="alert">
              {erroOpcoes}
            </p>
          )}

          <section
            aria-labelledby="titulo-competencias"
            className={styles.secao}
          >
            <h2 id="titulo-competencias" className={estados.secao}>
              Competências
            </h2>
            {pdi.itens.length === 0 ? (
              <p className={styles.vazio}>
                Nenhuma competência ainda. Adicione a primeira abaixo.
              </p>
            ) : (
              <ul className={estados.lista}>
                {pdi.itens.map((item) => (
                  <CompetenciaPdi key={item.id} item={item}>
                    <LigarTrilhaForm
                      key={versoesLigar[item.id] ?? 0}
                      competencia={item.competencia.nome}
                      trilhas={trilhas}
                      salvando={ligandoItemId === item.id}
                      erro={errosLigar[item.id]?.mensagem ?? null}
                      fieldErrors={errosLigar[item.id]?.fieldErrors ?? []}
                      onLigar={(request) => void ligar(item.id, request)}
                    />
                  </CompetenciaPdi>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="titulo-adicionar" className={styles.cartao}>
            <h2 id="titulo-adicionar" className={estados.secao}>
              Adicionar competência
            </h2>
            <AdicionarCompetenciaForm
              key={versaoFormItem}
              competencias={disponiveis}
              salvando={salvandoItem}
              erro={erroItem?.mensagem ?? null}
              fieldErrors={erroItem?.fieldErrors ?? []}
              selecionadaId={competenciaSelecionada}
              onSelecionar={setCompetenciaSelecionada}
              onNovaCompetencia={() => {
                setErroCompetencia(null)
                setDialogoAberto(true)
              }}
              onAdicionar={(request) => void adicionarItem(request)}
            />
          </section>
        </>
      )}

      {dialogoAberto && (
        <CompetenciaFormulario
          salvando={salvandoCompetencia}
          erro={erroCompetencia?.mensagem ?? null}
          fieldErrors={erroCompetencia?.fieldErrors ?? []}
          onCriar={(request) => void cadastrarCompetencia(request)}
          onFechar={() => setDialogoAberto(false)}
        />
      )}
    </div>
  )
}
