import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useDashboardRequest } from '../../hooks/useDashboardRequest.ts'
import { carregarDashboardGestao } from '../../services/dashboardService.ts'
import type {
  DashboardGestaoResponse,
  ResumoStatusDashboard,
} from '../../types/dashboard.ts'
import { ROTULOS_STATUS_PROGRESSO } from '../../types/trilha.ts'
import { ROTAS, caminhoTrilha } from '../../routes/paths.ts'
import { PainelDashboard, type EstadoPainel } from './PainelDashboard.tsx'
import {
  AlertaIcon,
  AreaIcon,
  CartaoIndicador,
  CheckIcon,
  GradeIndicadores,
  ItemAtencao,
  ListaIcon,
  PlayIcon,
  RelogioIcon,
  ResumoStatus,
  TopoDashboard,
  TrilhaIcon,
} from './PecasDashboard.tsx'
import lista from './ListaDashboard.module.css'

const MENSAGEM_VAZIA_TRILHAS =
  'Ainda não há eventos de início de trilhas registrados.'

/** Item de "Precisa de atenção" já montado a partir da resposta da API. */
interface Atencao {
  chave: string
  tom: 'perigo' | 'alerta'
  icone: ReactNode
  texto: string
  etiqueta: string
}

export function DashboardGestao({ saudacao }: { saudacao: ReactNode }) {
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
  const atencoes = montarAtencoes(resumo, areasValidas ? areas : [])
  const estadoAreas: EstadoPainel = carregando
    ? 'carregando'
    : erroAreas
      ? 'erro'
      : atencoes.length > 0
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

  const selo =
    atencoes.length > 0
      ? `${atencoes.length} ${plural(atencoes.length, 'item precisa', 'itens precisam')} de atenção`
      : null

  return (
    <div className={lista.coluna}>
      <TopoDashboard saudacao={saudacao} selo={selo} />

      <GradeIndicadores
        titulo="Indicadores gerais"
        carregando={carregando}
        erro={erroIndicadores}
      >
        {dados && resumo && (
          <>
            <CartaoIndicador
              tom="azul"
              icone={<TrilhaIcon />}
              valor={dados.trilhasAtivas}
              rotulo="Trilhas ativas"
            />
            <CartaoIndicador
              tom="roxo"
              icone={<ListaIcon />}
              valor={resumo.total}
              rotulo="Atribuições"
            />
            <CartaoIndicador
              tom="ciano"
              icone={<PlayIcon />}
              valor={resumo.emAndamento}
              rotulo="Em andamento"
            />
            <CartaoIndicador
              tom="verde"
              icone={<CheckIcon />}
              valor={`${formatarPercentual(dados.taxaConclusao)}%`}
              rotulo="Taxa de conclusão"
              progresso={dados.taxaConclusao}
            />
          </>
        )}
      </GradeIndicadores>

      {/* Colunas da mesma altura: o cartão de status acompanha as duas
          seções da esquerda juntas. */}
      <div className={`${lista.colunas} ${lista.colunasIguais}`}>
        <div className={lista.coluna}>
          <PainelDashboard
            titulo="Precisa de atenção"
            estado={estadoAreas}
            mensagemErro={erroAreas}
            mensagemVazia="Nada precisa da sua atenção agora."
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
                  para={ROTAS.acompanhamento}
                />
              ))}
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
            esticar
          >
            {resumo && (
              <>
                <ResumoStatus
                  resumo={resumo}
                  rotulos={ROTULOS_STATUS_PROGRESSO}
                  descricao="Atribuições por status"
                />
                {resumo.total === 0 && (
                  <p className={lista.nota}>
                    Ainda não há atribuições para resumir.
                  </p>
                )}
              </>
            )}
          </PainelDashboard>
        </div>
      </div>
    </div>
  )
}

/** Atrasos no geral, depois as áreas que mais atrasam, depois o que não começou. */
function montarAtencoes(
  resumo: ResumoStatusDashboard | undefined,
  areas: DashboardGestaoResponse['areasComMaisAtraso'],
): Atencao[] {
  const itens: Atencao[] = []
  if (resumo && resumo.atrasadas > 0) {
    itens.push({
      chave: 'atrasadas',
      tom: 'perigo',
      icone: <AlertaIcon />,
      texto: `${resumo.atrasadas} ${plural(resumo.atrasadas, 'atribuição está atrasada', 'atribuições estão atrasadas')}`,
      etiqueta: 'Atraso · todas as áreas',
    })
  }
  for (const area of areas) {
    itens.push({
      chave: `area-${area.areaId}`,
      tom: 'alerta',
      icone: <AreaIcon />,
      texto: `${area.areaNome} tem ${area.atribuicoesAtrasadas} ${plural(area.atribuicoesAtrasadas, 'atribuição atrasada', 'atribuições atrasadas')}`,
      etiqueta: 'Áreas com mais atraso',
    })
  }
  if (resumo && resumo.naoIniciadas > 0) {
    itens.push({
      chave: 'nao-iniciadas',
      tom: 'alerta',
      icone: <RelogioIcon />,
      texto: `${resumo.naoIniciadas} ${plural(resumo.naoIniciadas, 'atribuição ainda não foi iniciada', 'atribuições ainda não foram iniciadas')}`,
      etiqueta: 'Não iniciadas',
    })
  }
  return itens
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
    <ol className={lista.lista}>
      {itens.map((trilha, posicao) => {
        const valor = numeroSeguro(trilha.totalIniciadas)
        const percentual = maior > 0 ? (valor / maior) * 100 : 0
        return (
          <li key={trilha.trilhaId}>
            <Link
              to={caminhoTrilha(trilha.trilhaId)}
              className={`${lista.linha} ${lista.linhaLink}`}
            >
              <span className={lista.rankNumero} aria-hidden="true">
                {posicao + 1}
              </span>
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
    </ol>
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
