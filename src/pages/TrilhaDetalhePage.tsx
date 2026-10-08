import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  formatarData,
  formatarInstante,
} from '../components/trilhas/formatacao.ts'
import { AdicionarAoPdi } from '../components/pdi/AdicionarAoPdi.tsx'
import { JornadaTrilha } from '../components/trilhas/JornadaTrilha.tsx'
import {
  BarraProgresso,
  SeloStatus,
} from '../components/trilhas/StatusProgresso.tsx'
import { usePermissao } from '../hooks/usePermissao.ts'
import { ROTAS } from '../routes/paths.ts'
import { PERFIS_GESTAO_PDI } from '../routes/permissions.ts'
import {
  atualizarProgresso,
  buscarTrilha,
  iniciarTrilha,
  TrilhaServiceError,
} from '../services/trilhaService.ts'
import type { StatusProgresso, TrilhaDetalhe } from '../types/trilha.ts'
import styles from './TrilhaDetalhePage.module.css'

interface ResultadoBusca {
  /** Identifica a busca que produziu este resultado (id + recarga). */
  chave: string
  trilha: TrilhaDetalhe | null
  erro: TrilhaServiceError | null
}

interface Acao {
  rotulo: string
  emAndamento: string
  aviso: string
  secundaria: boolean
  executar: (id: string) => Promise<unknown>
}

/** A ação oferecida depende só do status atual — uma por vez, sem ambiguidade. */
const ACAO_POR_STATUS: Record<StatusProgresso, Acao> = {
  NAO_INICIADA: {
    rotulo: 'Iniciar trilha',
    emAndamento: 'Iniciando…',
    aviso: 'Trilha iniciada.',
    secundaria: false,
    executar: iniciarTrilha,
  },
  EM_ANDAMENTO: {
    rotulo: 'Marcar como concluída',
    emAndamento: 'Salvando…',
    aviso: 'Trilha concluída. Parabéns!',
    secundaria: false,
    executar: (id) => atualizarProgresso(id, { status: 'CONCLUIDA' }),
  },
  ATRASADA: {
    rotulo: 'Marcar como concluída',
    emAndamento: 'Salvando…',
    aviso: 'Trilha concluída. Parabéns!',
    secundaria: false,
    executar: (id) => atualizarProgresso(id, { status: 'CONCLUIDA' }),
  },
  CONCLUIDA: {
    rotulo: 'Retomar trilha',
    emAndamento: 'Salvando…',
    aviso: 'Trilha retomada.',
    secundaria: true,
    executar: (id) => atualizarProgresso(id, { status: 'EM_ANDAMENTO' }),
  },
}

function erroDe(causa: unknown, padrao: string): TrilhaServiceError {
  return causa instanceof TrilhaServiceError
    ? causa
    : new TrilhaServiceError(padrao)
}

/**
 * Detalhe de uma trilha com o progresso do usuário autenticado (Card 13).
 *
 * Depois de iniciar ou concluir, a tela não confia na resposta da escrita nem
 * atualiza de forma otimista: busca o detalhe de novo e mostra o que a API
 * devolveu. É o mesmo dado que a listagem lê, então as duas ficam iguais.
 */
export function TrilhaDetalhePage() {
  const { id = '' } = useParams()
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const podeAdicionarAoPdi = usePermissao(PERFIS_GESTAO_PDI)
  const [adicionandoAoPdi, setAdicionandoAoPdi] = useState(false)

  const chaveBusca = `${id}:${recarga}`
  const carregando = resultado?.chave !== chaveBusca
  const trilha = resultado?.chave === chaveBusca ? resultado.trilha : null
  const erroBusca = resultado?.chave === chaveBusca ? resultado.erro : null

  useEffect(() => {
    const controlador = new AbortController()

    buscarTrilha(id, { signal: controlador.signal })
      .then((detalhe) => {
        if (!controlador.signal.aborted) {
          setResultado({ chave: chaveBusca, trilha: detalhe, erro: null })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setResultado({
            chave: chaveBusca,
            trilha: null,
            erro: erroDe(causa, 'Não foi possível carregar a trilha.'),
          })
        }
      })

    return () => controlador.abort()
  }, [id, chaveBusca])

  // Ao chegar pela listagem, leva o foco ao título: quem usa leitor de tela
  // ouve onde está, em vez de continuar no link que já sumiu.
  const idCarregado = trilha?.id
  useEffect(() => {
    if (idCarregado) {
      tituloRef.current?.focus()
    }
  }, [idCarregado])

  async function executarAcao(detalhe: TrilhaDetalhe) {
    const acao = ACAO_POR_STATUS[detalhe.progresso.status]
    setSalvando(true)
    setAviso(null)
    setErroAcao(null)
    try {
      await acao.executar(detalhe.id)
      // Revalida com a API: o que aparece é o estado salvo, não o presumido.
      // Entra direto no resultado, sem passar pelo carregamento: a tela não pisca.
      const atualizado = await buscarTrilha(detalhe.id)
      setResultado({ chave: chaveBusca, trilha: atualizado, erro: null })
      setAviso(acao.aviso)
    } catch (causa) {
      setErroAcao(
        erroDe(causa, 'Não foi possível atualizar o progresso.').message,
      )
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className={styles.page}>
      <Link to={ROTAS.trilhas} className={styles.voltar}>
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
        Voltar para trilhas
      </Link>

      {carregando && <EsqueletoDetalhe />}

      {erroBusca && (
        <div
          className={
            erroBusca.status === 404 ? styles.naoEncontrada : styles.erro
          }
          role="alert"
        >
          <p className={styles.erroTitulo}>
            {erroBusca.status === 404
              ? 'Trilha não encontrada'
              : 'Não foi possível abrir a trilha'}
          </p>
          <p>
            {erroBusca.status === 404
              ? 'Ela pode ter sido removida ou não estar disponível para você.'
              : erroBusca.message}
          </p>
          {erroBusca.status === 404 ? (
            <Link to={ROTAS.trilhas} className={styles.erroAcao}>
              Ver todas as trilhas
            </Link>
          ) : (
            <button
              type="button"
              className={styles.erroAcao}
              onClick={() => setRecarga((atual) => atual + 1)}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {trilha && (
        <>
          <header className={styles.cabecalho}>
            <div className={styles.cabecalhoTopo}>
              <h1 ref={tituloRef} tabIndex={-1} className={styles.titulo}>
                {trilha.nome}
              </h1>
              {podeAdicionarAoPdi && (
                <button
                  type="button"
                  className={styles.botaoSecundario}
                  onClick={() => {
                    setAviso(null)
                    setAdicionandoAoPdi(true)
                  }}
                >
                  Adicionar ao PDI
                </button>
              )}
            </div>
            {(trilha.descricao ?? trilha.objetivos) && (
              <p className={styles.hint}>
                {trilha.descricao ?? trilha.objetivos}
              </p>
            )}
          </header>

          <div role="status" aria-live="polite" className={styles.avisoRegiao}>
            {aviso && <p className={styles.aviso}>{aviso}</p>}
          </div>

          <div className={styles.colunas}>
            <section aria-labelledby="titulo-jornada">
              <h2 id="titulo-jornada" className={styles.secao}>
                Jornada
              </h2>
              <div className={styles.painel}>
                <JornadaTrilha
                  progresso={trilha.progresso}
                  prazoDias={trilha.prazoDias}
                />
                <AcaoProgresso
                  trilha={trilha}
                  salvando={salvando}
                  erro={erroAcao}
                  onExecutar={() => void executarAcao(trilha)}
                />
              </div>
            </section>

            <div className={styles.lateral}>
              <section aria-labelledby="titulo-progresso">
                <h2 id="titulo-progresso" className={styles.secao}>
                  Progresso geral
                </h2>
                <div className={styles.painel}>
                  <div className={styles.progressoTopo}>
                    <SeloStatus status={trilha.progresso.status} />
                    <span className={styles.percentual}>
                      {trilha.progresso.percentual}%
                    </span>
                  </div>
                  <BarraProgresso
                    percentual={trilha.progresso.percentual}
                    rotulo={`Progresso em ${trilha.nome}`}
                    semValor
                  />
                  {trilha.progresso.prazo && (
                    <p className={styles.prazo}>
                      Prazo: {formatarData(trilha.progresso.prazo)}
                    </p>
                  )}
                </div>
              </section>

              <section aria-labelledby="titulo-sobre">
                <h2 id="titulo-sobre" className={styles.secao}>
                  Sobre a trilha
                </h2>
                <dl className={`${styles.painel} ${styles.dados}`}>
                  <div>
                    <dt>Área</dt>
                    <dd>{trilha.area?.nome ?? 'Multi-área'}</dd>
                  </div>
                  <div>
                    <dt>Duração prevista</dt>
                    <dd>
                      {trilha.prazoDias
                        ? `${trilha.prazoDias} ${trilha.prazoDias === 1 ? 'dia' : 'dias'}`
                        : 'Sem prazo definido'}
                    </dd>
                  </div>
                  {trilha.objetivos && (
                    <div className={styles.cheio}>
                      <dt>Objetivo</dt>
                      <dd>{trilha.objetivos}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Criada em</dt>
                    <dd>{formatarInstante(trilha.criadoEm)}</dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>

          {adicionandoAoPdi && (
            <AdicionarAoPdi
              trilha={trilha}
              onAdicionada={(mensagem) => {
                setAdicionandoAoPdi(false)
                setAviso(mensagem)
              }}
              onFechar={() => setAdicionandoAoPdi(false)}
            />
          )}
        </>
      )}
    </div>
  )
}

interface AcaoProgressoProps {
  trilha: TrilhaDetalhe
  salvando: boolean
  erro: string | null
  onExecutar: () => void
}

function AcaoProgresso({
  trilha,
  salvando,
  erro,
  onExecutar,
}: AcaoProgressoProps) {
  const acao = ACAO_POR_STATUS[trilha.progresso.status]
  return (
    <div className={styles.acaoArea}>
      {erro && (
        <p className={styles.erroAcaoTexto} role="alert">
          {erro}
        </p>
      )}
      <button
        type="button"
        className={acao.secundaria ? styles.botaoSecundario : styles.botao}
        onClick={onExecutar}
        disabled={salvando}
      >
        {salvando ? acao.emAndamento : acao.rotulo}
      </button>
    </div>
  )
}

function EsqueletoDetalhe() {
  return (
    <div aria-busy="true">
      <p role="status" className="visually-hidden">
        Carregando trilha…
      </p>
      <div className={styles.esqueleto} aria-hidden="true">
        <span className={styles.esqTitulo} />
        <span className={styles.esqTexto} />
        <div className={styles.colunas}>
          <span className={styles.esqPainel} />
          <span className={styles.esqPainel} />
        </div>
      </div>
    </div>
  )
}
