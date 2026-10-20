import { Link } from 'react-router-dom'
import { useDashboardRequest } from '../../hooks/useDashboardRequest.ts'
import {
  carregarDashboardColaborador,
} from '../../services/dashboardService.ts'
import type {
  DashboardColaboradorResponse,
  HistoricoInteracaoDashboard,
  ProximoPrazoDashboard,
  ResumoStatusDashboard,
} from '../../types/dashboard.ts'
import {
  ROTULOS_STATUS_PROGRESSO,
  type StatusProgresso,
} from '../../types/trilha.ts'
import { caminhoTrilha } from '../../routes/paths.ts'
import { PainelDashboard, type EstadoPainel } from './PainelDashboard.tsx'
import styles from './DashboardColaborador.module.css'

const ESTILOS_STATUS: Record<StatusProgresso, string> = {
  NAO_INICIADA: styles.statusNaoIniciada,
  EM_ANDAMENTO: styles.statusEmAndamento,
  CONCLUIDA: styles.statusConcluida,
  ATRASADA: styles.statusAtrasada,
}

const ROTULOS_INTERACAO = {
  TRILHA_ACESSADA: 'acessou',
  TRILHA_INICIADA: 'iniciou',
  TRILHA_CONCLUIDA: 'concluiu',
} as const

export function DashboardColaborador() {
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
  const erroResumo =
    dados && !resumoValido(resumo)
      ? 'A API retornou um resumo de trilhas inválido.'
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

  const atividades = dados?.ultimasAtividades
  const atividadesValidas = listaDeAtividadesValida(atividades)
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

  const percentualMedioValido =
    typeof dados?.percentualMedio === 'number' &&
    Number.isFinite(dados.percentualMedio) &&
    dados.percentualMedio >= 0 &&
    dados.percentualMedio <= 100
  const erroPercentual =
    dados && !percentualMedioValido
      ? 'A API retornou um percentual médio inválido.'
      : erro
  const estadoPercentual: EstadoPainel = carregando
    ? 'carregando'
    : erroPercentual
      ? 'erro'
      : 'pronto'

  return (
    <div className={styles.grid}>
      <PainelDashboard
        titulo="Suas trilhas"
        estado={estadoResumo}
        mensagemErro={erroResumo}
      >
        {resumo && <ResumoTrilhas resumo={resumo} />}
      </PainelDashboard>

      <PainelDashboard
        titulo="Progresso médio"
        estado={estadoPercentual}
        mensagemErro={erroPercentual}
      >
        <div className={styles.percentual}>
          <strong>{formatarPercentual(dados?.percentualMedio ?? 0)}%</strong>
          <span>de progresso médio nas suas trilhas</span>
          {resumo?.total === 0 && (
            <span className={styles.meta}>
              Não há trilhas atribuídas para calcular a média.
            </span>
          )}
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label="Percentual médio de progresso nas trilhas"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={limitarPercentual(dados?.percentualMedio ?? 0)}
          >
            <span
              className={styles.progressFill}
              style={{
                width: `${limitarPercentual(dados?.percentualMedio ?? 0)}%`,
              }}
              aria-hidden="true"
            />
          </div>
        </div>
      </PainelDashboard>

      <PainelDashboard
        titulo="Próximos prazos"
        estado={estadoPrazos}
        mensagemErro={erroPrazos}
        mensagemVazia="Você não tem prazos nos próximos sete dias."
      >
        <ul className={styles.list}>
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
        <ul className={styles.list}>
          {(atividadesValidas ? atividades : []).map((atividade) => (
            <AtividadeItem key={atividade.id} atividade={atividade} />
          ))}
        </ul>
      </PainelDashboard>
    </div>
  )
}

function ResumoTrilhas({ resumo }: { resumo: ResumoStatusDashboard }) {
  const indicadores = [
    { rotulo: 'Total', valor: resumo.total },
    { rotulo: 'Não iniciadas', valor: resumo.naoIniciadas },
    { rotulo: 'Em andamento', valor: resumo.emAndamento },
    { rotulo: 'Concluídas', valor: resumo.concluidas },
    { rotulo: 'Atrasadas', valor: resumo.atrasadas },
  ]

  return (
    <>
      <div className={styles.indicators}>
        {indicadores.map((item) => (
          <div key={item.rotulo} className={styles.indicator}>
            <strong>{item.valor}</strong>
            <span>{item.rotulo}</span>
          </div>
        ))}
      </div>
      {resumo.total === 0 && (
        <p className={styles.emptyNote} role="status">
          Você ainda não tem trilhas atribuídas.
        </p>
      )}
    </>
  )
}

function PrazoItem({ prazo }: { prazo: ProximoPrazoDashboard }) {
  return (
    <li className={styles.listItem}>
      <div className={styles.itemMain}>
        <Link className={styles.itemLink} to={caminhoTrilha(prazo.trilhaId)}>
          {prazo.trilhaNome}
        </Link>
        <span className={styles.meta}>
          Prazo: {formatarData(prazo.prazo)} · {prazo.percentual}% concluído
        </span>
      </div>
      <span className={`${styles.status} ${ESTILOS_STATUS[prazo.status]}`}>
        {ROTULOS_STATUS_PROGRESSO[prazo.status]}
      </span>
    </li>
  )
}

function AtividadeItem({
  atividade,
}: {
  atividade: HistoricoInteracaoDashboard
}) {
  const trilhaNome = texto(atividade.detalhes?.trilhaNome) ?? 'uma trilha'
  const acao = ROTULOS_INTERACAO[atividade.tipo] ?? 'interagiu com'
  const quando = formatarDataHora(atividade.criadoEm)

  return (
    <li className={styles.listItem}>
      <div className={styles.itemMain}>
        <span className={styles.activityTitle}>
          Você {acao} <strong>{trilhaNome}</strong>
        </span>
        <span className={styles.meta}>{quando}</span>
      </div>
    </li>
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

function listaDePrazosValida(
  valor: unknown,
): valor is ProximoPrazoDashboard[] {
  return Array.isArray(valor) && valor.every((item: unknown) => {
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
        Object.prototype.hasOwnProperty.call(
          ROTULOS_INTERACAO,
          atividade.tipo,
        ) &&
        typeof atividade.criadoEm === 'string' &&
        !Number.isNaN(Date.parse(atividade.criadoEm)) &&
        detalhes !== null &&
        typeof detalhes === 'object' &&
        !Array.isArray(detalhes) &&
        Boolean(atividade.usuario) &&
        typeof atividade.usuario === 'object' &&
        !Array.isArray(atividade.usuario) &&
        typeof (atividade.usuario as Record<string, unknown>).id ===
          'string' &&
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

function limitarPercentual(valor: number): number {
  return Math.min(100, Math.max(0, valor))
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
