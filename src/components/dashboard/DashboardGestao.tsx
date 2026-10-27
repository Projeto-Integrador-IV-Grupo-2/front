import { Link } from 'react-router-dom'
import { useDashboardRequest } from '../../hooks/useDashboardRequest.ts'
import { carregarDashboardGestao } from '../../services/dashboardService.ts'
import type {
  DashboardGestaoResponse,
  ResumoStatusDashboard,
} from '../../types/dashboard.ts'
import type { StatusProgresso } from '../../types/trilha.ts'
import { ROTULOS_STATUS_PROGRESSO } from '../../types/trilha.ts'
import { ROTAS, caminhoTrilha } from '../../routes/paths.ts'
import { PainelDashboard, type EstadoPainel } from './PainelDashboard.tsx'
import lista from './ListaDashboard.module.css'
import styles from './DashboardGestao.module.css'

const MENSAGEM_VAZIA_TRILHAS =
  'Ainda não há eventos de início de trilhas registrados.'

const STATUS: Array<{
  chave: keyof Pick<
    ResumoStatusDashboard,
    'naoIniciadas' | 'emAndamento' | 'concluidas' | 'atrasadas'
  >
  status: StatusProgresso
  ponto: string
  barra: string
}> = [
  {
    chave: 'naoIniciadas',
    status: 'NAO_INICIADA',
    ponto: '',
    barra: styles.barraNeutra,
  },
  {
    chave: 'emAndamento',
    status: 'EM_ANDAMENTO',
    ponto: styles.pontoPrimario,
    barra: '',
  },
  {
    chave: 'concluidas',
    status: 'CONCLUIDA',
    ponto: styles.pontoSucesso,
    barra: styles.barraSucesso,
  },
  {
    chave: 'atrasadas',
    status: 'ATRASADA',
    ponto: lista.pontoPerigo,
    barra: styles.barraPerigo,
  },
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
  const resumo = resumoValido ? dados!.atribuicoesPorStatus : undefined

  // "Precisa de atenção" junta os atrasos, as áreas que mais atrasam e o que
  // ainda não começou: tudo vem da mesma resposta da API.
  const areas = dados?.areasComMaisAtraso
  const areasValidas = listaDeAreasValida(areas)
  const erroAreas =
    dados && !areasValidas
      ? 'A API retornou uma lista de áreas inválida.'
      : erro
  const temAtencao =
    (areasValidas && areas.length > 0) ||
    (resumo !== undefined && resumo.atrasadas + resumo.naoIniciadas > 0)
  const estadoAreas: EstadoPainel = carregando
    ? 'carregando'
    : erroAreas
      ? 'erro'
      : temAtencao
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
    <div className={lista.coluna}>
      <section
        aria-labelledby="painel-indicadores-gerais"
        aria-busy={carregando}
      >
        <h3 id="painel-indicadores-gerais" className="visually-hidden">
          Indicadores gerais
        </h3>
        <div className={lista.faixa}>
          {carregando && (
            <p className={lista.faixaEstado} role="status">
              Carregando…
            </p>
          )}
          {!carregando && erroIndicadores && (
            <p
              className={`${lista.faixaEstado} ${lista.faixaErro}`}
              role="alert"
            >
              {erroIndicadores}
            </p>
          )}
          {!carregando && !erroIndicadores && dados && resumo && (
            <>
              <Indicador valor={dados.trilhasAtivas} rotulo="Trilhas ativas" />
              <Indicador valor={resumo.total} rotulo="Atribuições" />
              <Indicador valor={resumo.emAndamento} rotulo="Em andamento" />
              <Indicador
                valor={`${formatarPercentual(dados.taxaConclusao)}%`}
                rotulo="Taxa de conclusão"
              />
            </>
          )}
        </div>
      </section>

      <div className={lista.colunas}>
        <div className={lista.coluna}>
          <PainelDashboard
            titulo="Precisa de atenção"
            estado={estadoAreas}
            mensagemErro={erroAreas}
            mensagemVazia="Nada precisa da sua atenção agora."
          >
            <ul className={lista.lista}>
              {resumo && resumo.atrasadas > 0 && (
                <LinhaAtencao
                  ponto={lista.pontoPerigo}
                  texto={`${resumo.atrasadas} ${plural(resumo.atrasadas, 'atribuição está atrasada', 'atribuições estão atrasadas')}`}
                  etiqueta="Atraso · todas as áreas"
                />
              )}
              {(areasValidas ? areas : []).map((area) => (
                <LinhaAtencao
                  key={area.areaId}
                  ponto={lista.pontoAlerta}
                  texto={`${area.areaNome} tem ${area.atribuicoesAtrasadas} ${plural(area.atribuicoesAtrasadas, 'atribuição atrasada', 'atribuições atrasadas')}`}
                  etiqueta="Áreas com mais atraso"
                />
              ))}
              {resumo && resumo.naoIniciadas > 0 && (
                <LinhaAtencao
                  ponto=""
                  texto={`${resumo.naoIniciadas} ${plural(resumo.naoIniciadas, 'atribuição ainda não foi iniciada', 'atribuições ainda não foram iniciadas')}`}
                  etiqueta="Não iniciadas"
                />
              )}
            </ul>
          </PainelDashboard>

          <PainelDashboard
            titulo="Trilhas mais iniciadas"
            estado={estadoTrilhas}
            mensagemErro={erroTrilhas}
            mensagemVazia={MENSAGEM_VAZIA_TRILHAS}
          >
            <TrilhasIniciadas itens={trilhasValidas ? trilhas : []} />
          </PainelDashboard>
        </div>

        <div className={lista.coluna}>
          <PainelDashboard
            titulo="Atribuições por status"
            estado={estadoResumo}
            mensagemErro={erroResumo}
          >
            {resumo && <GraficoStatus resumo={resumo} />}
          </PainelDashboard>
        </div>
      </div>
    </div>
  )
}

function Indicador({
  valor,
  rotulo,
}: {
  valor: number | string
  rotulo: string
}) {
  return (
    <div className={lista.faixaItem}>
      <strong className={lista.faixaValor}>{valor}</strong>
      <span className={lista.faixaRotulo}>{rotulo}</span>
    </div>
  )
}

/** Linha de "Precisa de atenção": leva ao acompanhamento das atribuições. */
function LinhaAtencao({
  ponto,
  texto,
  etiqueta,
}: {
  ponto: string
  texto: string
  etiqueta: string
}) {
  return (
    <li>
      <Link
        to={ROTAS.acompanhamento}
        className={`${lista.linha} ${lista.linhaLink}`}
      >
        <span className={`${lista.ponto} ${ponto}`} aria-hidden="true" />
        <span className={lista.linhaCorpo}>
          <span className={lista.linhaTitulo}>{texto}</span>
          <span className={lista.etiqueta}>{etiqueta}</span>
        </span>
        <ChevronIcon />
      </Link>
    </li>
  )
}

function TrilhasIniciadas({
  itens,
}: {
  itens: DashboardGestaoResponse['trilhasMaisIniciadas']
}) {
  const maior = Math.max(
    0,
    ...itens.map((item) => numeroSeguro(item.totalIniciadas)),
  )
  return (
    <ul className={lista.lista}>
      {itens.map((trilha) => {
        const valor = numeroSeguro(trilha.totalIniciadas)
        const percentual = maior > 0 ? (valor / maior) * 100 : 0
        return (
          <li key={trilha.trilhaId}>
            <Link
              to={caminhoTrilha(trilha.trilhaId)}
              className={`${lista.linha} ${lista.linhaLink}`}
            >
              <span className={lista.linhaCorpo}>
                <span className={lista.linhaTitulo}>{trilha.trilhaNome}</span>
                <span className={lista.linhaMeta}>
                  {valor} {plural(valor, 'início', 'inícios')}
                </span>
              </span>
              <span className={lista.miniBarra} aria-hidden="true">
                <span
                  className={lista.barraPreenchida}
                  style={{ width: `${percentual}%` }}
                />
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function GraficoStatus({ resumo }: { resumo: ResumoStatusDashboard }) {
  return (
    <div
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
      <ul className={lista.lista}>
        {STATUS.map((item) => {
          const valor = resumo[item.chave]
          const percentual =
            resumo.total > 0 ? Math.min(100, (valor / resumo.total) * 100) : 0
          return (
            <li key={item.chave} className={lista.linha}>
              <span
                className={`${lista.ponto} ${item.ponto}`}
                aria-hidden="true"
              />
              <span className={lista.linhaCorpo}>
                <span className={lista.linhaTitulo}>
                  {ROTULOS_STATUS_PROGRESSO[item.status]}
                </span>
              </span>
              <span className={lista.miniBarra} aria-hidden="true">
                <span
                  className={`${lista.barraPreenchida} ${item.barra}`}
                  style={{ width: `${percentual}%` }}
                />
              </span>
              <strong className={lista.valor}>{valor}</strong>
            </li>
          )
        })}
      </ul>
      {resumo.total === 0 && (
        <p className={lista.nota}>Ainda não há atribuições para resumir.</p>
      )}
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg
      className={lista.chevron}
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function plural(valor: number, singular: string, varios: string): string {
  return valor === 1 ? singular : varios
}

function resumoDeStatusValido(valor: unknown): valor is ResumoStatusDashboard {
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
