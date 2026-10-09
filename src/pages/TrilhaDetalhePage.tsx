import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AtribuirTrilha } from '../components/trilhas/AtribuirTrilha.tsx'
import { ColaboradoresAtribuidos } from '../components/trilhas/ColaboradoresAtribuidos.tsx'
import { ConfirmacaoSituacaoTrilha } from '../components/trilhas/ConfirmacaoSituacaoTrilha.tsx'
import {
  formatarData,
  formatarInstante,
} from '../components/trilhas/formatacao.ts'
import { JornadaTrilha } from '../components/trilhas/JornadaTrilha.tsx'
import {
  BarraProgresso,
  Selo,
  SeloStatus,
} from '../components/trilhas/StatusProgresso.tsx'
import { TrilhaFormulario } from '../components/trilhas/TrilhaFormulario.tsx'
import { usePermissao } from '../hooks/usePermissao.ts'
import { ROTAS } from '../routes/paths.ts'
import {
  PERFIS_ACOMPANHAMENTO,
  PERFIS_ATRIBUIR_TRILHA,
  PERFIS_GESTAO_TRILHA,
} from '../routes/permissions.ts'
import { HTTP_STATUS } from '../utils/errorHandler.ts'
import {
  AtribuicaoServiceError,
  listarAtribuicoes,
} from '../services/atribuicaoService.ts'
import {
  ativarTrilha,
  atribuirTrilha,
  atualizarProgresso,
  atualizarTrilha,
  buscarTrilha,
  iniciarTrilha,
  inativarTrilha,
  listarAreasParaTrilha,
  listarUsuariosParaAtribuicao,
  TrilhaServiceError,
} from '../services/trilhaService.ts'
import type { ApiFieldError } from '../types/api.ts'
import type { AtribuicaoAcompanhamento } from '../types/atribuicao.ts'
import type {
  AtribuirTrilhaRequest,
  CriarTrilhaRequest,
  ResultadoAtribuicao,
  StatusProgresso,
  TrilhaDetalhe,
} from '../types/trilha.ts'
import type { RecursoResumo, Usuario } from '../types/usuario.ts'
import styles from './TrilhaDetalhePage.module.css'

/**
 * Quantos colaboradores o painel do detalhe mostra. É um resumo: quem precisa
 * da lista inteira, com filtros e paginação, vai para o Acompanhamento.
 */
const COLABORADORES_NO_PAINEL = 10

interface ResultadoBusca {
  /** Identifica a busca que produziu este resultado (id + recarga). */
  chave: string
  trilha: TrilhaDetalhe | null
  erro: TrilhaServiceError | null
}

interface ResultadoAtribuidos {
  /** Identifica a busca que produziu este resultado (trilha + recarga). */
  chave: string
  atribuicoes: AtribuicaoAcompanhamento[] | null
  total: number
  erro: string | null
}

interface Acao {
  rotulo: string
  emAndamento: string
  aviso: string
  secundaria: boolean
  executar: (id: string) => Promise<unknown>
}

/** Qual diálogo está aberto. Um por vez: os três são modais. */
type Dialogo = 'edicao' | 'situacao' | 'atribuicao'

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

/** "2 colaboradores receberam a trilha. 1 já tinha e foi ignorado." */
function avisoDaAtribuicao({
  atribuidos,
  ignorados,
}: ResultadoAtribuicao): string {
  const recebeu =
    atribuidos === 0
      ? 'Ninguém novo recebeu a trilha'
      : `${atribuidos} ${atribuidos === 1 ? 'colaborador recebeu' : 'colaboradores receberam'} a trilha`
  if (ignorados === 0) {
    return `${recebeu}.`
  }
  return `${recebeu}. ${ignorados} já ${ignorados === 1 ? 'tinha' : 'tinham'} e ${ignorados === 1 ? 'foi ignorado' : 'foram ignorados'}.`
}

/**
 * Detalhe de uma trilha com o progresso do usuário autenticado (Card 13) e a
 * gestão da trilha (issue #40): o administrador edita e inativa/reativa, e
 * administrador e gestor atribuem a trilha a colaboradores ou a uma área.
 *
 * Depois de iniciar ou concluir, a tela não confia na resposta da escrita nem
 * atualiza de forma otimista: busca o detalhe de novo e mostra o que a API
 * devolveu. É o mesmo dado que a listagem lê, então as duas ficam iguais.
 * Edição e inativação já respondem com o detalhe salvo, que entra direto no
 * lugar do antigo — a tela se atualiza sem recarregar a página.
 */
export function TrilhaDetalhePage() {
  const { id = '' } = useParams()
  const podeGerenciar = usePermissao(PERFIS_GESTAO_TRILHA)
  const podeAtribuir = usePermissao(PERFIS_ATRIBUIR_TRILHA)
  // Mesma permissão da tela de Acompanhamento, de onde vem o dado do painel.
  const podeVerAtribuidos = usePermissao(PERFIS_ACOMPANHAMENTO)

  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)

  const [recargaAtribuidos, setRecargaAtribuidos] = useState(0)
  const [atribuidos, setAtribuidos] = useState<ResultadoAtribuidos | null>(null)

  const [dialogo, setDialogo] = useState<Dialogo | null>(null)
  const [erroDialogo, setErroDialogo] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])
  const [areas, setAreas] = useState<RecursoResumo[] | null>(null)
  const [areasIndisponiveis, setAreasIndisponiveis] = useState(false)
  const [colaboradores, setColaboradores] = useState<Usuario[] | null>(null)
  const [colaboradoresIndisponiveis, setColaboradoresIndisponiveis] =
    useState(false)
  // Devolve o foco a quem abriu o diálogo quando ele fecha.
  const editarRef = useRef<HTMLButtonElement>(null)
  const situacaoRef = useRef<HTMLButtonElement>(null)
  const atribuirRef = useRef<HTMLButtonElement>(null)

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

  // Quem recebeu a trilha. Só para quem pode acompanhar; refeito depois de
  // cada atribuição, para o painel já mostrar quem acabou de entrar.
  const chaveAtribuidos = podeVerAtribuidos
    ? `${id}:${recargaAtribuidos}`
    : null
  useEffect(() => {
    if (chaveAtribuidos === null) {
      return
    }
    const controlador = new AbortController()

    listarAtribuicoes(
      { trilhaId: id },
      { page: 0, size: COLABORADORES_NO_PAINEL },
      { signal: controlador.signal },
    )
      .then((pagina) => {
        if (!controlador.signal.aborted) {
          setAtribuidos({
            chave: chaveAtribuidos,
            atribuicoes: pagina.content,
            total: pagina.page.totalElements,
            erro: null,
          })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setAtribuidos({
            chave: chaveAtribuidos,
            atribuicoes: [],
            total: 0,
            erro:
              causa instanceof AtribuicaoServiceError
                ? causa.message
                : 'Não foi possível carregar os colaboradores desta trilha.',
          })
        }
      })

    return () => controlador.abort()
  }, [chaveAtribuidos, id])

  // As áreas alimentam a edição e a atribuição; são buscadas uma vez, quando
  // o primeiro diálogo que precisa delas abre.
  const precisaDeAreas = dialogo === 'edicao' || dialogo === 'atribuicao'
  useEffect(() => {
    if (!precisaDeAreas || areas !== null) {
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
  }, [precisaDeAreas, areas])

  // Um gestor pode receber 403 na lista de usuários: aí sobra a atribuição
  // por área, e o diálogo avisa.
  useEffect(() => {
    if (dialogo !== 'atribuicao' || colaboradores !== null) {
      return
    }
    let ativo = true
    listarUsuariosParaAtribuicao()
      .then((lista) => {
        if (ativo) {
          setColaboradores(lista)
        }
      })
      .catch(() => {
        if (ativo) {
          setColaboradores([])
          setColaboradoresIndisponiveis(true)
        }
      })
    return () => {
      ativo = false
    }
  }, [dialogo, colaboradores])

  function abrirDialogo(qual: Dialogo) {
    setErroDialogo(null)
    setFieldErrors([])
    setAviso(null)
    setErroAcao(null)
    setDialogo(qual)
  }

  function fecharDialogo() {
    const aberto = dialogo
    setDialogo(null)
    setErroDialogo(null)
    setFieldErrors([])
    // Sem isso o foco cairia no <body> quando o diálogo some.
    const origem =
      aberto === 'edicao'
        ? editarRef
        : aberto === 'situacao'
          ? situacaoRef
          : atribuirRef
    origem.current?.focus()
  }

  /** Troca o detalhe em mãos pelo que a API acabou de salvar. */
  function aplicarDetalhe(detalhe: TrilhaDetalhe, mensagem: string) {
    setResultado({ chave: chaveBusca, trilha: detalhe, erro: null })
    setAviso(mensagem)
  }

  function registrarErroDoDialogo(causa: unknown, padrao: string) {
    const erro = erroDe(causa, padrao)
    setErroDialogo(erro.message)
    setFieldErrors(erro.fieldErrors)
  }

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

  async function salvarEdicao(
    detalhe: TrilhaDetalhe,
    request: CriarTrilhaRequest,
  ) {
    setSalvando(true)
    setErroDialogo(null)
    setFieldErrors([])
    try {
      const atualizado = await atualizarTrilha(detalhe.id, request)
      fecharDialogo()
      aplicarDetalhe(atualizado, 'Trilha atualizada.')
    } catch (causa) {
      registrarErroDoDialogo(causa, 'Não foi possível salvar as alterações.')
    } finally {
      setSalvando(false)
    }
  }

  async function alternarSituacao(detalhe: TrilhaDetalhe) {
    setSalvando(true)
    setErroDialogo(null)
    try {
      const atualizado = detalhe.ativo
        ? await inativarTrilha(detalhe.id)
        : await ativarTrilha(detalhe.id)
      fecharDialogo()
      aplicarDetalhe(
        atualizado,
        detalhe.ativo ? 'Trilha inativada.' : 'Trilha reativada.',
      )
    } catch (causa) {
      registrarErroDoDialogo(
        causa,
        'Não foi possível alterar a situação da trilha.',
      )
    } finally {
      setSalvando(false)
    }
  }

  async function atribuir(
    detalhe: TrilhaDetalhe,
    request: AtribuirTrilhaRequest,
  ) {
    setSalvando(true)
    setErroDialogo(null)
    setFieldErrors([])
    try {
      const resumo = await atribuirTrilha(detalhe.id, request)
      fecharDialogo()
      setAviso(avisoDaAtribuicao(resumo))
      // O painel de colaboradores passa a incluir quem acabou de receber.
      setRecargaAtribuidos((atual) => atual + 1)
    } catch (causa) {
      registrarErroDoDialogo(causa, 'Não foi possível atribuir a trilha.')
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
            erroBusca.status === HTTP_STATUS.NOT_FOUND
              ? styles.naoEncontrada
              : styles.erro
          }
          role="alert"
        >
          <p className={styles.erroTitulo}>
            {erroBusca.status === HTTP_STATUS.NOT_FOUND
              ? 'Trilha não encontrada'
              : 'Não foi possível abrir a trilha'}
          </p>
          <p>
            {erroBusca.status === HTTP_STATUS.NOT_FOUND
              ? 'Ela pode ter sido removida ou não estar disponível para você.'
              : erroBusca.message}
          </p>
          {erroBusca.status === HTTP_STATUS.NOT_FOUND ? (
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
            <div className={styles.identificacao}>
              <div className={styles.selosTitulo}>
                <h1 ref={tituloRef} tabIndex={-1} className={styles.titulo}>
                  {trilha.nome}
                </h1>
                {trilha.progresso.status === 'ATRASADA' && (
                  <Selo tom="perigo">Atrasada</Selo>
                )}
                {!trilha.ativo && <Selo tom="neutro">Inativa</Selo>}
              </div>
              {(trilha.descricao ?? trilha.objetivos) && (
                <p className={styles.hint}>
                  {trilha.descricao ?? trilha.objetivos}
                </p>
              )}
            </div>

            {(podeGerenciar || podeAtribuir) && (
              <div className={styles.acoesGestao}>
                {podeGerenciar && (
                  <>
                    <button
                      ref={editarRef}
                      type="button"
                      className={styles.botaoSecundario}
                      onClick={() => abrirDialogo('edicao')}
                    >
                      Editar trilha
                    </button>
                    <button
                      ref={situacaoRef}
                      type="button"
                      className={styles.botaoSecundario}
                      onClick={() => abrirDialogo('situacao')}
                    >
                      {trilha.ativo ? 'Inativar' : 'Reativar'}
                    </button>
                  </>
                )}
                {podeAtribuir && trilha.ativo && (
                  <button
                    ref={atribuirRef}
                    type="button"
                    className={styles.botao}
                    onClick={() => abrirDialogo('atribuicao')}
                  >
                    Atribuir colaboradores
                  </button>
                )}
              </div>
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
                {trilha.ativo ? (
                  <AcaoProgresso
                    trilha={trilha}
                    salvando={salvando}
                    erro={erroAcao}
                    onExecutar={() => void executarAcao(trilha)}
                  />
                ) : (
                  <p className={styles.inativaAviso}>
                    Trilha inativa: o progresso de quem já a recebeu fica
                    guardado, mas não pode ser alterado.
                  </p>
                )}
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
                    <p
                      className={
                        trilha.progresso.status === 'ATRASADA'
                          ? `${styles.prazo} ${styles.prazoAtrasado}`
                          : styles.prazo
                      }
                    >
                      {trilha.progresso.status === 'ATRASADA'
                        ? 'Prazo vencido em '
                        : 'Prazo: '}
                      {formatarData(trilha.progresso.prazo)}
                    </p>
                  )}
                </div>
              </section>

              {podeVerAtribuidos && (
                <section aria-labelledby="titulo-atribuidos">
                  <h2 id="titulo-atribuidos" className={styles.secao}>
                    Colaboradores atribuídos
                  </h2>
                  <ColaboradoresAtribuidos
                    atribuicoes={
                      atribuidos?.chave === chaveAtribuidos
                        ? atribuidos.atribuicoes
                        : null
                    }
                    total={
                      atribuidos?.chave === chaveAtribuidos
                        ? atribuidos.total
                        : 0
                    }
                    erro={
                      atribuidos?.chave === chaveAtribuidos
                        ? atribuidos.erro
                        : null
                    }
                    onTentarNovamente={() =>
                      setRecargaAtribuidos((atual) => atual + 1)
                    }
                  />
                </section>
              )}

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
                  <div>
                    <dt>Situação</dt>
                    <dd>{trilha.ativo ? 'Ativa' : 'Inativa'}</dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>

          {dialogo === 'edicao' && (
            <TrilhaFormulario
              trilha={trilha}
              areas={areas ?? []}
              areasIndisponiveis={areasIndisponiveis}
              salvando={salvando}
              erro={erroDialogo}
              fieldErrors={fieldErrors}
              onSalvar={(request) => void salvarEdicao(trilha, request)}
              onFechar={fecharDialogo}
            />
          )}

          {dialogo === 'situacao' && (
            <ConfirmacaoSituacaoTrilha
              trilha={trilha}
              processando={salvando}
              onConfirmar={() => void alternarSituacao(trilha)}
              onCancelar={fecharDialogo}
            />
          )}

          {dialogo === 'atribuicao' && (
            <AtribuirTrilha
              trilha={trilha}
              colaboradores={colaboradores}
              colaboradoresIndisponiveis={colaboradoresIndisponiveis}
              areas={areas ?? []}
              salvando={salvando}
              erro={erroDialogo}
              fieldErrors={fieldErrors}
              onAtribuir={(request) => void atribuir(trilha, request)}
              onFechar={fecharDialogo}
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
