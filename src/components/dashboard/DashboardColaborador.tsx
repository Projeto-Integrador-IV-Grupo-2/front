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
  AlertaIcon,
  CartaoIndicador,
  CheckIcon,
  GradeIndicadores,
  ItemAtencao,
  PlayIcon as PlayIconIndicador,
  RelogioIcon,
  ResumoStatus,
  TopoDashboard,
  TrilhaIcon,
} from './PecasDashboard.tsx'
import { formatarData, plural, textoDoAtraso } from './datas.ts'
import lista from './ListaDashboard.module.css'
import styles from './DashboardColaborador.module.css'

const ROTULOS_INTERACAO = {
  TRILHA_ACESSADA: 'acessou',
  TRILHA_INICIADA: 'iniciou',
  TRILHA_CONCLUIDA: 'concluiu',
} as const

type AtividadeDeTrilha = HistoricoInteracaoDashboard & {
  tipo: keyof typeof ROTULOS_INTERACAO
}

export function DashboardColaborador({
  saudacao,
}: {
  saudacao: (descricao: string) => ReactNode
}) {
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

  const minhas = useMinhasTrilhas()
  const estadoMinhas: EstadoPainel =
    minhas.status === 'carregando'
      ? 'carregando'
      : minhas.status === 'erro'
        ? 'erro'
        : minhas.trilhas.length > 0
          ? 'pronto'
          : 'vazio'

  // Mesmo arranjo do painel de gestão, com os dados de quem está logado:
  // o que pede atenção, as trilhas com o progresso e o resumo por status.
  // Cada trilha atrasada aparece pelo nome, seguida das que vencem na semana.
  const atencoes = montarAtencoes(minhas.trilhas, prazosValidos ? prazos : [])
  const estadoAtencoes: EstadoPainel =
    carregando || minhas.status === 'carregando'
      ? 'carregando'
      : erroPrazos && minhas.status === 'erro'
        ? 'erro'
        : atencoes.length > 0
          ? 'pronto'
          : 'vazio'

  const totalAtrasadas = resumoOk
    ? resumo.atrasadas
    : atencoes.filter((item) => item.tom === 'perigo').length
  const selo =
    totalAtrasadas > 0
      ? `${totalAtrasadas} ${plural(totalAtrasadas, 'trilha atrasada', 'trilhas atrasadas')}`
      : null
  const descricao = descricaoColaborador(
    resumoOk ? resumo : undefined,
    percentualMedioValido ? dados!.percentualMedio : undefined,
    prazosValidos ? prazos.filter((p) => p.status !== 'CONCLUIDA').length : 0,
  )

  return (
    <div className={lista.coluna}>
      <TopoDashboard saudacao={saudacao(descricao)} selo={selo} />

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

      <div className={lista.colunas}>
        <div className={lista.coluna}>
          <PainelDashboard
            titulo="Atrasadas e próximos prazos"
            estado={estadoAtencoes}
            mensagemErro={erroPrazos}
            mensagemVazia="Nenhuma trilha atrasada e nenhum prazo nesta semana."
            semCartao
          >
            <ul className={lista.atencoes}>
              {atencoes.map((item) => (
                <ItemAtencao
                  key={item.chave}
                  tom={item.tom}
                  icone={item.icone}
                  texto={item.texto}
                  etiqueta={item.etiqueta}
                  para={item.para}
                />
              ))}
            </ul>
          </PainelDashboard>

          <PainelDashboard
            titulo="Minhas trilhas"
            estado={estadoMinhas}
            mensagemErro="Não foi possível carregar suas trilhas."
            mensagemVazia="Você ainda não recebeu nenhuma trilha."
          >
            <MinhasTrilhas trilhas={minhas.trilhas} />
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
            titulo="Suas trilhas por status"
            estado={estadoResumo}
            mensagemErro={erroResumo}
          >
            {resumoOk && <ResumoTrilhas resumo={resumo} />}
          </PainelDashboard>
        </div>
      </div>
    </div>
  )
}

/** Item de "Precisa de atenção" do colaborador. */
interface Atencao {
  chave: string
  tom: 'perigo' | 'alerta'
  icone: ReactNode
  texto: string
  etiqueta: string
  para: string
}

/**
 * Cada trilha atrasada pelo nome (da que venceu há mais tempo), depois as
 * que vencem nos próximos sete dias.
 */
function montarAtencoes(
  trilhas: TrilhaResumo[],
  prazos: ProximoPrazoDashboard[],
): Atencao[] {
  const atrasadas = trilhas
    .filter((trilha) => trilha.progresso?.status === 'ATRASADA')
    .sort((a, b) =>
      (a.progresso?.prazo ?? '').localeCompare(b.progresso?.prazo ?? ''),
    )
  const itens: Atencao[] = atrasadas.map((trilha) => {
    const prazo = trilha.progresso?.prazo ?? null
    const partes = [textoDoAtraso(prazo)]
    if (prazo) partes.push(`prazo ${formatarData(prazo)}`)
    partes.push(`${trilha.progresso?.percentual ?? 0}% concluído`)
    return {
      chave: `atrasada-${trilha.id}`,
      tom: 'perigo',
      icone: <AlertaIcon />,
      texto: trilha.nome,
      etiqueta: partes.join(' · '),
      para: caminhoTrilha(trilha.id),
    }
  })
  const jaListadas = new Set(atrasadas.map((trilha) => trilha.id))
  for (const prazo of prazos) {
    if (prazo.status === 'CONCLUIDA' || jaListadas.has(prazo.trilhaId)) continue
    itens.push({
      chave: `prazo-${prazo.atribuicaoId}`,
      tom: prazo.status === 'ATRASADA' ? 'perigo' : 'alerta',
      icone: <RelogioIcon />,
      texto: prazo.trilhaNome,
      etiqueta: `Vence em ${formatarData(prazo.prazo)} · ${prazo.percentual}% concluído`,
      para: caminhoTrilha(prazo.trilhaId),
    })
  }
  return itens
}

/** Subtítulo da saudação com os números de quem está logado. */
function descricaoColaborador(
  resumo: ResumoStatusDashboard | undefined,
  percentualMedio: number | undefined,
  prazosDaSemana: number,
): string {
  if (!resumo) return 'Veja seu progresso e o que você precisa fazer agora.'
  if (resumo.total === 0) return 'Você ainda não recebeu nenhuma trilha.'
  const partes: string[] = []
  if (resumo.atrasadas > 0) {
    partes.push(
      `${resumo.atrasadas} ${plural(resumo.atrasadas, 'trilha atrasada', 'trilhas atrasadas')}`,
    )
  }
  if (prazosDaSemana > 0) {
    partes.push(
      `${prazosDaSemana} ${plural(prazosDaSemana, 'prazo', 'prazos')} nesta semana`,
    )
  }
  partes.push(`${resumo.emAndamento} em andamento`)
  const media =
    percentualMedio !== undefined
      ? ` Progresso médio: ${formatarPercentual(percentualMedio)}%.`
      : ''
  return `Você tem ${partes.join(', ')}.${media}`
}

/** As trilhas recebidas, com o progresso de cada uma — como o ranking da gestão. */
function MinhasTrilhas({ trilhas }: { trilhas: TrilhaResumo[] }) {
  return (
    <ol className={lista.lista}>
      {trilhas.map((trilha) => {
        const status = trilha.progresso?.status ?? 'NAO_INICIADA'
        const percentual = trilha.progresso?.percentual ?? 0
        return (
          <li key={trilha.id}>
            <Link
              to={caminhoTrilha(trilha.id)}
              className={`${lista.linha} ${lista.linhaLink}`}
            >
              <span className={lista.linhaCorpo}>
                <span className={lista.linhaTitulo}>{trilha.nome}</span>
                <span className={lista.linhaMeta}>
                  {ROTULOS_STATUS_PROGRESSO[status]} · {percentual}% concluído
                  {trilha.progresso?.prazo &&
                    ` · prazo em ${formatarData(trilha.progresso.prazo)}`}
                </span>
              </span>
              <span
                className={lista.miniBarra}
                role="progressbar"
                aria-label={`Progresso em ${trilha.nome}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentual}
              >
                <span
                  className={lista.barraPreenchida}
                  style={{ width: `${percentual}%` }}
                />
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

interface MinhasTrilhasEstado {
  status: 'carregando' | 'pronto' | 'erro'
  trilhas: TrilhaResumo[]
}

/** Trilhas recebidas pelo usuário, da mais urgente (prazo) para a menos. */
function useMinhasTrilhas(): MinhasTrilhasEstado {
  const [estado, setEstado] = useState<MinhasTrilhasEstado>({
    status: 'carregando',
    trilhas: [],
  })
  useEffect(() => {
    const controlador = new AbortController()
    listarTrilhas(
      { minhas: true },
      { page: 0, size: 20, sort: 'prazo' },
      { signal: controlador.signal },
    )
      .then((pagina) => {
        if (!controlador.signal.aborted) {
          setEstado({ status: 'pronto', trilhas: pagina.content })
        }
      })
      .catch(() => {
        if (!controlador.signal.aborted) {
          setEstado({ status: 'erro', trilhas: [] })
        }
      })
    return () => controlador.abort()
  }, [])
  return estado
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

function formatarDataHora(valor: string): string {
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return 'Data indisponível'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}
