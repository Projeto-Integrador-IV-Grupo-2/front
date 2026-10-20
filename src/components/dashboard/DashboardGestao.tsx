import { useDashboardRequest } from '../../hooks/useDashboardRequest.ts'
import { carregarDashboardGestao } from '../../services/dashboardService.ts'
import type {
  DashboardGestaoResponse,
  ResumoStatusDashboard,
} from '../../types/dashboard.ts'
import type { StatusProgresso } from '../../types/trilha.ts'
import { ROTULOS_STATUS_PROGRESSO } from '../../types/trilha.ts'
import { PainelDashboard, type EstadoPainel } from './PainelDashboard.tsx'
import styles from './DashboardGestao.module.css'

const MENSAGEM_VAZIA_TRILHAS =
  'Ainda não há eventos de início de trilhas registrados.'

const STATUS: Array<{
  chave: keyof Pick<
    ResumoStatusDashboard,
    'naoIniciadas' | 'emAndamento' | 'concluidas' | 'atrasadas'
  >
  status: StatusProgresso
  classe: string
}> = [
  {
    chave: 'naoIniciadas',
    status: 'NAO_INICIADA',
    classe: styles.barNaoIniciada,
  },
  {
    chave: 'emAndamento',
    status: 'EM_ANDAMENTO',
    classe: styles.barEmAndamento,
  },
  { chave: 'concluidas', status: 'CONCLUIDA', classe: styles.barConcluida },
  { chave: 'atrasadas', status: 'ATRASADA', classe: styles.barAtrasada },
]

export function DashboardGestao() {
  const estado = useDashboardRequest<DashboardGestaoResponse>(
    carregarDashboardGestao,
  )
  const dados = estado.status === 'sucesso' ? estado.dados : undefined
  const erro =
    estado.status === 'erro'
      ? estado.mensagem
      : estado.status === 'sucesso' && (!dados || typeof dados !== 'object')
        ? 'A API retornou uma resposta inválida para o dashboard.'
        : undefined
  const carregando = estado.status === 'carregando'

  const resumoValido = resumoDeStatusValido(dados?.atribuicoesPorStatus)
  const erroResumo =
    dados && !resumoValido
      ? 'A API retornou um resumo de atribuições inválido.'
      : erro
  const estadoResumo: EstadoPainel = carregando
    ? 'carregando'
    : erroResumo
      ? 'erro'
      : 'pronto'

  const trilhasAtivasValido =
    typeof dados?.trilhasAtivas === 'number' &&
    Number.isSafeInteger(dados.trilhasAtivas) &&
    dados.trilhasAtivas >= 0
  const taxaValida =
    typeof dados?.taxaConclusao === 'number' &&
    Number.isFinite(dados.taxaConclusao) &&
    dados.taxaConclusao >= 0 &&
    dados.taxaConclusao <= 100
  const erroIndicadores =
    dados && (!trilhasAtivasValido || !taxaValida || !resumoValido)
      ? 'A API retornou indicadores inválidos.'
      : erro
  const estadoIndicadores: EstadoPainel = carregando
    ? 'carregando'
    : erroIndicadores
      ? 'erro'
      : 'pronto'

  const areas = dados?.areasComMaisAtraso
  const areasValidas = listaDeAreasValida(areas)
  const erroAreas =
    dados && !areasValidas
      ? 'A API retornou uma lista de áreas inválida.'
      : erro
  const estadoAreas: EstadoPainel = carregando
    ? 'carregando'
    : erroAreas
      ? 'erro'
      : areasValidas && areas.length > 0
        ? 'pronto'
        : 'vazio'

  const trilhas = dados?.trilhasMaisIniciadas
  const trilhasValidas = listaDeTrilhasValida(trilhas)
  const erroTrilhas =
    dados && !trilhasValidas
      ? 'A API retornou uma lista de trilhas inválida.'
      : erro
  const estadoTrilhas: EstadoPainel = carregando
    ? 'carregando'
    : erroTrilhas
      ? 'erro'
      : trilhasValidas && trilhas.length > 0
        ? 'pronto'
        : 'vazio'

  return (
    <div className={styles.layout}>
      <PainelDashboard
        titulo="Indicadores gerais"
        estado={estadoIndicadores}
        mensagemErro={erroIndicadores}
      >
        {dados && (
          <>
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <span>Trilhas ativas</span>
                <strong>{dados.trilhasAtivas}</strong>
              </div>
              <div className={styles.metric}>
                <span>Atribuições</span>
                <strong>{dados.atribuicoesPorStatus?.total ?? '—'}</strong>
              </div>
              <div className={styles.metric}>
                <span>Taxa de conclusão</span>
                <strong>{formatarPercentual(dados.taxaConclusao)}%</strong>
              </div>
            </div>
            {dados.atribuicoesPorStatus?.total === 0 && (
              <p className={styles.emptyNote} role="status">
                Ainda não há atribuições para calcular os indicadores de
                conclusão.
              </p>
            )}
          </>
        )}
      </PainelDashboard>

      <PainelDashboard
        titulo="Atribuições por status"
        estado={estadoResumo}
        mensagemErro={erroResumo}
      >
        {resumoValido && <GraficoStatus resumo={dados!.atribuicoesPorStatus} />}
      </PainelDashboard>

      <PainelDashboard
        titulo="Áreas com mais atraso"
        estado={estadoAreas}
        mensagemErro={erroAreas}
        mensagemVazia="Nenhuma área possui atribuições atrasadas."
      >
        <GraficoLista
          itens={(areasValidas ? areas : []).map((area) => ({
            id: area.areaId,
            rotulo: area.areaNome,
            valor: area.atribuicoesAtrasadas,
          }))}
          descricaoValor={(valor) => `${valor} atribuições atrasadas`}
        />
      </PainelDashboard>

      <PainelDashboard
        titulo="Trilhas mais iniciadas"
        estado={estadoTrilhas}
        mensagemErro={erroTrilhas}
        mensagemVazia={MENSAGEM_VAZIA_TRILHAS}
      >
        <GraficoLista
          itens={(trilhasValidas ? trilhas : []).map((trilha) => ({
            id: trilha.trilhaId,
            rotulo: trilha.trilhaNome,
            valor: trilha.totalIniciadas,
          }))}
          descricaoValor={(valor) => `${valor} inícios`}
        />
      </PainelDashboard>
    </div>
  )
}

function GraficoStatus({ resumo }: { resumo: ResumoStatusDashboard }) {
  return (
    <div
      className={styles.chart}
      role="group"
      aria-label={
        `Atribuições por status: ` +
        `${ROTULOS_STATUS_PROGRESSO.NAO_INICIADA}: ${resumo.naoIniciadas}; ` +
        `${ROTULOS_STATUS_PROGRESSO.EM_ANDAMENTO}: ${resumo.emAndamento}; ` +
        `${ROTULOS_STATUS_PROGRESSO.CONCLUIDA}: ${resumo.concluidas}; ` +
        `${ROTULOS_STATUS_PROGRESSO.ATRASADA}: ${resumo.atrasadas}. ` +
        `Total: ${resumo.total}.`
      }
    >
      {STATUS.map((item) => {
        const valor = resumo[item.chave]
        const percentual =
          resumo.total > 0 ? Math.min(100, (valor / resumo.total) * 100) : 0
        return (
          <div key={item.chave} className={styles.barRow}>
            <div className={styles.barLabel}>
              <span>{ROTULOS_STATUS_PROGRESSO[item.status]}</span>
              <strong>{valor}</strong>
            </div>
            <div className={styles.barTrack} aria-hidden="true">
              <span
                className={`${styles.barFill} ${item.classe}`}
                style={{ width: `${percentual}%` }}
              />
            </div>
          </div>
        )
      })}
      {resumo.total === 0 && (
        <p className={styles.emptyNote}>
          Ainda não há atribuições para resumir.
        </p>
      )}
    </div>
  )
}

interface ItemGraficoLista {
  id: string
  rotulo: string
  valor: number
}

function GraficoLista({
  itens,
  descricaoValor,
}: {
  itens: ItemGraficoLista[]
  descricaoValor: (valor: number) => string
}) {
  const maior = Math.max(0, ...itens.map((item) => numeroSeguro(item.valor)))
  return (
    <div className={styles.chart}>
      {itens.map((item) => {
        const valor = numeroSeguro(item.valor)
        const percentual = maior > 0 ? (valor / maior) * 100 : 0
        return (
          <div key={item.id} className={styles.barRow}>
            <div className={styles.barLabel}>
              <span>{item.rotulo}</span>
              <strong>{descricaoValor(valor)}</strong>
            </div>
            <div className={styles.barTrack} aria-hidden="true">
              <span
                className={`${styles.barFill} ${styles.barPrincipal}`}
                style={{ width: `${percentual}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function resumoDeStatusValido(
  valor: unknown,
): valor is ResumoStatusDashboard {
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

function listaDeAreasValida(
  valor: unknown,
): valor is DashboardGestaoResponse['areasComMaisAtraso'] {
  return (
    Array.isArray(valor) &&
    valor.every((item: unknown) => {
      if (!item || typeof item !== 'object') return false
      const area = item as Record<string, unknown>
      return (
        typeof area.areaId === 'string' &&
        area.areaId.trim().length > 0 &&
        typeof area.areaNome === 'string' &&
        area.areaNome.trim().length > 0 &&
        typeof area.atribuicoesAtrasadas === 'number' &&
        Number.isSafeInteger(area.atribuicoesAtrasadas) &&
        area.atribuicoesAtrasadas >= 0
      )
    })
  )
}

function listaDeTrilhasValida(
  valor: unknown,
): valor is DashboardGestaoResponse['trilhasMaisIniciadas'] {
  return (
    Array.isArray(valor) &&
    valor.every((item: unknown) => {
      if (!item || typeof item !== 'object') return false
      const trilha = item as Record<string, unknown>
      return (
        typeof trilha.trilhaId === 'string' &&
        trilha.trilhaId.trim().length > 0 &&
        typeof trilha.trilhaNome === 'string' &&
        trilha.trilhaNome.trim().length > 0 &&
        typeof trilha.totalIniciadas === 'number' &&
        Number.isSafeInteger(trilha.totalIniciadas) &&
        trilha.totalIniciadas >= 0
      )
    })
  )
}

function numeroSeguro(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0
    ? valor
    : 0
}

function formatarPercentual(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(valor)
}
