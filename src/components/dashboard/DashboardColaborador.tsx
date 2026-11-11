import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useDashboardRequest } from '../../hooks/useDashboardRequest.ts'
import { carregarDashboardColaborador } from '../../services/dashboardService.ts'
import { listarTrilhas } from '../../services/trilhaService.ts'
import type {
  DashboardColaboradorResponse,
  HistoricoInteracaoDashboard,
  ProximoPrazoDashboard,
  ResumoStatusDashboard,
} from '../../types/dashboard.ts'
import { TIPOS_INTERACAO } from '../../types/historico.ts'
import {
  ROTULOS_STATUS_PROGRESSO,
  type StatusProgresso,
  type TrilhaResumo,
} from '../../types/trilha.ts'
import { ROTAS, caminhoTrilha } from '../../routes/paths.ts'
import { PainelDashboard, type EstadoPainel } from './PainelDashboard.tsx'
import {
  CartaoIndicador,
  CheckIcon,
  GradeIndicadores,
  PlayIcon as PlayIconIndicador,
  RelogioIcon,
  ResumoStatus,
  TopoDashboard,
  TrilhaIcon,
} from './PecasDashboard.tsx'
import lista from './ListaDashboard.module.css'
import styles from './DashboardColaborador.module.css'

const SELOS_STATUS: Record<StatusProgresso, string> = {
  NAO_INICIADA: lista.seloNeutro,
  EM_ANDAMENTO: lista.seloAndamento,
  CONCLUIDA: lista.seloSucesso,
  ATRASADA: lista.seloPerigo,
}

const ROTULOS_INTERACAO = {
  TRILHA_ACESSADA: 'acessou',
  TRILHA_INICIADA: 'iniciou',
  TRILHA_CONCLUIDA: 'concluiu',
} as const

/** Trilha do cartão "Continue de onde parou". */
interface TrilhaParaContinuar {
  trilhaId: string
  trilhaNome: string
  detalhe: string
}

type AtividadeDeTrilha = HistoricoInteracaoDashboard & {
  tipo: keyof typeof ROTULOS_INTERACAO
}

export function DashboardColaborador({ saudacao }: { saudacao: ReactNode }) {
  const estado = useDashboardRequest<DashboardColaboradorResponse>(
    carregarDashboardColaborador,
  )
  const dados = estado.status === 'sucesso' ? estado.dados : undefined
  const erro =
    estado.status === 'erro'
      ? estado.mensagem
      : estado.status === 'sucesso' && (!dados || typeof dados !== 'object')
        ? 'A API retornou uma resposta inválida para o dashboard.'
        : undefined
  const carregando = estado.status === 'carregando'

  const resumo = dados?.trilhasPorStatus
  const resumoOk = resumoValido(resumo)
  const percentualMedioValido =
    typeof dados?.percentualMedio === 'number' &&
    Number.isFinite(dados.percentualMedio) &&
    dados.percentualMedio >= 0 &&
    dados.percentualMedio <= 100
  // O resumo e a média dividem o mesmo cartão, "Suas trilhas".
  const erroResumo =
    dados && !resumoOk
      ? 'A API retornou um resumo de trilhas inválido.'
      : dados && !percentualMedioValido
        ? 'A API retornou um percentual médio inválido.'
        : erro
  const estadoResumo: EstadoPainel = carregando
    ? 'carregando'
    : erroResumo
      ? 'erro'
      : 'pronto'

  const prazos = dados?.proximosPrazos
  const prazosValidos = listaDePrazosValida(prazos)
  const erroPrazos =
    dados && !prazosValidos
      ? 'A API retornou uma lista de prazos inválida.'
      : erro
  const estadoPrazos: EstadoPainel = carregando
    ? 'carregando'
    : erroPrazos
      ? 'erro'
      : prazosValidos && prazos.length > 0
        ? 'pronto'
        : 'vazio'

  // O histórico também tem interações que não são de trilha (pergunta à IA,
  // senha redefinida): elas não entram neste painel, mas também não podem
  // invalidar a lista inteira.
  const atividadesValidas = listaDeAtividadesValida(dados?.ultimasAtividades)
  const atividades = atividadesValidas
    ? (dados?.ultimasAtividades ?? []).filter(ehAtividadeDeTrilha)
    : []
  const erroAtividades =
    dados && !atividadesValidas
      ? 'A API retornou uma lista de atividades inválida.'
      : erro
  const estadoAtividades: EstadoPainel = carregando
    ? 'carregando'
    : erroAtividades
      ? 'erro'
      : atividadesValidas && atividades.length > 0
        ? 'pronto'
        : 'vazio'

  const minhasTrilhas = useMinhasTrilhas()
  const continuar = trilhaParaContinuar(
    prazosValidos ? prazos : [],
    minhasTrilhas,
    atividadesValidas ? atividades : [],
  )

  const quantosPrazos = prazosValidos
    ? prazos.filter((prazo) => prazo.status !== 'CONCLUIDA').length
    : 0
  const selo =
    quantosPrazos > 0
      ? `${quantosPrazos} ${quantosPrazos === 1 ? 'prazo' : 'prazos'} nesta semana`
      : null

  return (
    <div className={lista.coluna}>
      <TopoDashboard saudacao={saudacao} selo={selo} />

      <GradeIndicadores
        titulo="Seus indicadores"
        carregando={carregando}
        erro={erroResumo}
      >
        {resumoOk && (
          <>
            <CartaoIndicador
              tom="azul"
              icone={<TrilhaIcon />}
              valor={resumo.total}
              rotulo="Trilhas atribuídas"
            />
            <CartaoIndicador
              tom="ciano"
              icone={<PlayIconIndicador />}
              valor={resumo.emAndamento}
              rotulo="Em andamento"
            />
            <CartaoIndicador
              tom="verde"
              icone={<CheckIcon />}
              valor={resumo.concluidas}
              rotulo="Concluídas"
            />
            <CartaoIndicador
              tom="roxo"
              icone={<RelogioIcon />}
              valor={`${formatarPercentual(dados?.percentualMedio ?? 0)}%`}
              rotulo="Progresso médio"
              progresso={dados?.percentualMedio ?? 0}
            />
          </>
        )}
      </GradeIndicadores>

      {continuar && <CartaoContinuar trilha={continuar} />}

      <div className={lista.colunas}>
        <div className={lista.coluna}>
          <PainelDashboard
            titulo="Próximos prazos"
            estado={estadoPrazos}
            mensagemErro={erroPrazos}
            mensagemVazia="Você não tem prazos nos próximos sete dias."
          >
            <ul className={lista.lista}>
              {(prazosValidos ? prazos : []).map((prazo) => (
                <PrazoItem key={prazo.atribuicaoId} prazo={prazo} />
              ))}
            </ul>
          </PainelDashboard>

          <PainelDashboard
            titulo="Últimas atividades"
            estado={estadoAtividades}
            mensagemErro={erroAtividades}
            mensagemVazia="Suas interações com as trilhas aparecerão aqui."
          >
            <ul className={lista.lista}>
              {(atividadesValidas ? atividades : []).map((atividade) => (
                <AtividadeItem key={atividade.id} atividade={atividade} />
              ))}
            </ul>
          </PainelDashboard>
        </div>

        <div className={lista.coluna}>
          <PainelDashboard
            titulo="Suas trilhas"
            estado={estadoResumo}
            mensagemErro={erroResumo}
          >
            {resumoOk && <ResumoTrilhas resumo={resumo} />}
          </PainelDashboard>

          <aside className={styles.ia} aria-label="Assistente de IA">
            <span className={styles.iaIcone}>
              <SparkleIcon />
            </span>
            <div>
              <p className={styles.iaTexto}>
                Dúvida sobre uma política, um processo ou um código interno?
                Pergunte à IA — ela consulta toda a base de conhecimento da
                empresa.
              </p>
              <Link to={ROTAS.assistente} className={styles.iaBotao}>
                Abrir assistente
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

/** Ordem de prioridade do "Continue de onde parou" entre as minhas trilhas. */
const PRIORIDADE_CONTINUAR: StatusProgresso[] = [
  'ATRASADA',
  'EM_ANDAMENTO',
  'NAO_INICIADA',
]

/**
 * Trilhas do usuário (iniciadas ou recebidas), pelo prazo. O dashboard só
 * traz prazos dos próximos sete dias; sem esta lista, uma trilha recebida com
 * prazo maior não apareceria em lugar nenhum da visão geral. Se a busca
 * falhar, o cartão usa as outras fontes.
 */
function useMinhasTrilhas(): TrilhaResumo[] {
  const [trilhas, setTrilhas] = useState<TrilhaResumo[]>([])
  useEffect(() => {
    const controlador = new AbortController()
    listarTrilhas(
      { minhas: true },
      { page: 0, size: 20, sort: 'prazo' },
      { signal: controlador.signal },
    )
      .then((pagina) => {
        if (!controlador.signal.aborted) setTrilhas(pagina.content)
      })
      .catch(() => undefined)
    return () => controlador.abort()
  }, [])
  return trilhas
}

/**
 * A trilha para retomar: o prazo mais próximo ainda aberto; senão, a minha
 * trilha mais urgente (atrasada, em andamento, não iniciada); por fim, a
 * última trilha acessada ou iniciada.
 */
function trilhaParaContinuar(
  prazos: ProximoPrazoDashboard[],
  minhas: TrilhaResumo[],
  atividades: HistoricoInteracaoDashboard[],
): TrilhaParaContinuar | undefined {
  const prazo = prazos.find((item) => item.status !== 'CONCLUIDA')
  if (prazo) {
    return {
      trilhaId: prazo.trilhaId,
      trilhaNome: prazo.trilhaNome,
      detalhe: `${prazo.percentual}% concluído · prazo em ${formatarData(prazo.prazo)}`,
    }
  }
  for (const status of PRIORIDADE_CONTINUAR) {
    const trilha = minhas.find((item) => item.progresso?.status === status)
    if (trilha?.progresso) {
      const { percentual, prazo: dataPrazo } = trilha.progresso
      return {
        trilhaId: trilha.id,
        trilhaNome: trilha.nome,
        detalhe: dataPrazo
          ? `${percentual}% concluído · prazo em ${formatarData(dataPrazo)}`
          : `${percentual}% concluído`,
      }
    }
  }
  const atividade = atividades.find(
    (item) =>
      item.tipo !== 'TRILHA_CONCLUIDA' &&
      texto(item.detalhes?.trilhaId) &&
      texto(item.detalhes?.trilhaNome),
  )
  if (!atividade) return undefined
  return {
    trilhaId: texto(atividade.detalhes.trilhaId)!,
    trilhaNome: texto(atividade.detalhes.trilhaNome)!,
    detalhe: `Último acesso em ${formatarDataHora(atividade.criadoEm)}`,
  }
}

function CartaoContinuar({ trilha }: { trilha: TrilhaParaContinuar }) {
  return (
    <section className={styles.continuar} aria-labelledby="continuar-titulo">
      <span className={styles.continuarIcone}>
        <PlayIcon />
      </span>
      <div className={styles.continuarCorpo}>
        <span className={styles.continuarRotulo}>Continue de onde parou</span>
        <h3 id="continuar-titulo" className={styles.continuarTitulo}>
          {trilha.trilhaNome}
        </h3>
        <p className={styles.continuarDetalhe}>{trilha.detalhe}</p>
      </div>
      <Link
        to={caminhoTrilha(trilha.trilhaId)}
        className={styles.continuarBotao}
        aria-label={`Continuar ${trilha.trilhaNome}`}
      >
        Continuar
      </Link>
    </section>
  )
}

function ResumoTrilhas({ resumo }: { resumo: ResumoStatusDashboard }) {
  return (
    <>
      {resumo.total === 0 ? (
        <p className={lista.nota} role="status">
          Você ainda não tem trilhas atribuídas.
        </p>
      ) : (
        <ResumoStatus
          resumo={resumo}
          rotulos={ROTULOS_PLURAIS}
          descricao="Suas trilhas por status"
        />
      )}
      <Link to={ROTAS.trilhas} className={styles.verTodas}>
        Ver minhas trilhas ({resumo.total})
      </Link>
    </>
  )
}

const ROTULOS_PLURAIS: Record<StatusProgresso, string> = {
  EM_ANDAMENTO: 'Em andamento',
  NAO_INICIADA: 'Não iniciadas',
  CONCLUIDA: 'Concluídas',
  ATRASADA: 'Atrasadas',
}

function PrazoItem({ prazo }: { prazo: ProximoPrazoDashboard }) {
  return (
    <li>
      <Link
        to={caminhoTrilha(prazo.trilhaId)}
        className={`${lista.linha} ${lista.linhaLink}`}
      >
        <span className={lista.linhaCorpo}>
          <span className={lista.linhaTitulo}>{prazo.trilhaNome}</span>
          <span className={lista.linhaMeta}>
            Prazo: {formatarData(prazo.prazo)} · {prazo.percentual}% concluído
          </span>
        </span>
        <span className={`${lista.selo} ${SELOS_STATUS[prazo.status]}`}>
          {ROTULOS_STATUS_PROGRESSO[prazo.status]}
        </span>
      </Link>
    </li>
  )
}

function AtividadeItem({ atividade }: { atividade: AtividadeDeTrilha }) {
  const trilhaNome = texto(atividade.detalhes?.trilhaNome) ?? 'uma trilha'
  const acao = ROTULOS_INTERACAO[atividade.tipo] ?? 'interagiu com'
  const quando = formatarDataHora(atividade.criadoEm)

  return (
    <li className={lista.linha}>
      <span className={lista.linhaCorpo}>
        <span className={lista.linhaTitulo}>
          Você {acao} <strong>{trilhaNome}</strong>
        </span>
        <span className={lista.linhaMeta}>{quando}</span>
      </span>
    </li>
  )
}

function PlayIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 5l8 5-8 5V5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 2.5l1.4 4.6 4.6 1.4-4.6 1.4L10 14.5l-1.4-4.6-4.6-1.4 4.6-1.4L10 2.5z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function resumoValido(valor: unknown): valor is ResumoStatusDashboard {
  if (!valor || typeof valor !== 'object') return false
  const resumo = valor as Record<string, unknown>
  const campos = [
    'total',
    'naoIniciadas',
    'emAndamento',
    'concluidas',
    'atrasadas',
  ] as const
  if (
    !campos.every(
      (campo) =>
        typeof resumo[campo] === 'number' &&
        Number.isSafeInteger(resumo[campo]) &&
        resumo[campo] >= 0,
    )
  ) {
    return false
  }

  const total = resumo.total as number
  const somaStatus =
    (resumo.naoIniciadas as number) +
    (resumo.emAndamento as number) +
    (resumo.concluidas as number) +
    (resumo.atrasadas as number)
  return somaStatus === total
}

function listaDePrazosValida(valor: unknown): valor is ProximoPrazoDashboard[] {
  return (
    Array.isArray(valor) &&
    valor.every((item: unknown) => {
      if (!item || typeof item !== 'object') return false
      const prazo = item as Record<string, unknown>
      return (
        typeof prazo.atribuicaoId === 'string' &&
        prazo.atribuicaoId.trim().length > 0 &&
        typeof prazo.trilhaId === 'string' &&
        prazo.trilhaId.trim().length > 0 &&
        typeof prazo.trilhaNome === 'string' &&
        prazo.trilhaNome.trim().length > 0 &&
        typeof prazo.prazo === 'string' &&
        prazo.prazo.trim().length > 0 &&
        typeof prazo.percentual === 'number' &&
        Number.isInteger(prazo.percentual) &&
        prazo.percentual >= 0 &&
        prazo.percentual <= 100 &&
        typeof prazo.status === 'string' &&
        Object.prototype.hasOwnProperty.call(
          ROTULOS_STATUS_PROGRESSO,
          prazo.status,
        )
      )
    })
  )
}

function ehAtividadeDeTrilha(
  atividade: HistoricoInteracaoDashboard,
): atividade is AtividadeDeTrilha {
  return Object.prototype.hasOwnProperty.call(ROTULOS_INTERACAO, atividade.tipo)
}

function listaDeAtividadesValida(
  valor: unknown,
): valor is HistoricoInteracaoDashboard[] {
  return (
    Array.isArray(valor) &&
    valor.every((item: unknown) => {
      if (!item || typeof item !== 'object') return false
      const atividade = item as Record<string, unknown>
      const detalhes = atividade.detalhes
      return (
        typeof atividade.id === 'string' &&
        atividade.id.trim().length > 0 &&
        typeof atividade.tipo === 'string' &&
        TIPOS_INTERACAO.some((tipo) => tipo === atividade.tipo) &&
        typeof atividade.criadoEm === 'string' &&
        !Number.isNaN(Date.parse(atividade.criadoEm)) &&
        detalhes !== null &&
        typeof detalhes === 'object' &&
        !Array.isArray(detalhes) &&
        Boolean(atividade.usuario) &&
        typeof atividade.usuario === 'object' &&
        !Array.isArray(atividade.usuario) &&
        typeof (atividade.usuario as Record<string, unknown>).id === 'string' &&
        typeof (atividade.usuario as Record<string, unknown>).nomeCompleto ===
          'string' &&
        typeof (atividade.usuario as Record<string, unknown>).email === 'string'
      )
    })
  )
}

function texto(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor.trim() ? valor : undefined
}

function formatarPercentual(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(valor)
}

function formatarData(valor: string): string {
  const partes = valor.split('-').map(Number)
  if (
    partes.length !== 3 ||
    partes.some((parte) => !Number.isFinite(parte)) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return 'Data indisponível'
  }
  const [ano, mes, dia] = partes
  const data = new Date(ano, mes - 1, dia)
  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return 'Data indisponível'
  }
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(data)
}

function formatarDataHora(valor: string): string {
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return 'Data indisponível'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}
