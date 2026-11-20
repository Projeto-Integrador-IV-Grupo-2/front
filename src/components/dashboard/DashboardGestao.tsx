import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useDashboardRequest } from '../../hooks/useDashboardRequest.ts'
import { listarAtribuicoes } from '../../services/atribuicaoService.ts'
import { carregarDashboardGestao } from '../../services/dashboardService.ts'
import type { AtribuicaoAcompanhamento } from '../../types/atribuicao.ts'
import type {
  DashboardGestaoResponse,
  ResumoStatusDashboard,
} from '../../types/dashboard.ts'
import { ROTULOS_STATUS_PROGRESSO } from '../../types/trilha.ts'
import {
  ACOMPANHAMENTO_ATRASADAS,
  caminhoColaboradorNaTrilha,
  caminhoTrilha,
} from '../../routes/paths.ts'
import { PainelDashboard, type EstadoPainel } from './PainelDashboard.tsx'
import {
  AlertaIcon,
  CartaoIndicador,
  CheckIcon,
  GradeIndicadores,
  ItemAtencao,
  ListaIcon,
  PlayIcon,
  ResumoStatus,
  TopoDashboard,
  TrilhaIcon,
  VerTodas,
} from './PecasDashboard.tsx'
import { formatarData, plural, textoDoAtraso } from './datas.ts'
import lista from './ListaDashboard.module.css'

const MENSAGEM_VAZIA_TRILHAS =
  'Ainda não há eventos de início de trilhas registrados.'

/** Quantas atribuições atrasadas o dashboard mostra (as de prazo mais antigo). */
const LIMITE_ATRASADAS = 5

export function DashboardGestao({
  saudacao,
}: {
  saudacao: (descricao: string) => ReactNode
}) {
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

  // As atribuições atrasadas de verdade (trilha, colaborador, prazo), das
  // que venceram há mais tempo para as mais recentes.
  const atrasadas = useAtribuicoesAtrasadas()
  const estadoAtrasadas: EstadoPainel =
    atrasadas.status === 'carregando'
      ? 'carregando'
      : atrasadas.status === 'erro'
        ? 'erro'
        : atrasadas.itens.length > 0
          ? 'pronto'
          : 'vazio'

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

  const totalAtrasadas =
    atrasadas.status === 'pronto' ? atrasadas.total : (resumo?.atrasadas ?? 0)
  const selo =
    totalAtrasadas > 0
      ? `${totalAtrasadas} ${plural(totalAtrasadas, 'trilha atrasada', 'trilhas atrasadas')}`
      : null

  return (
    <div className={lista.coluna}>
      <TopoDashboard
        saudacao={saudacao(
          descricaoGestao(
            resumo,
            taxaValida ? dados!.taxaConclusao : undefined,
          ),
        )}
        selo={selo}
      />

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

      <div className={lista.colunas}>
        <div className={lista.coluna}>
          <PainelDashboard
            titulo="Trilhas atrasadas"
            estado={estadoAtrasadas}
            mensagemErro="Não foi possível carregar as trilhas atrasadas."
            mensagemVazia="Nenhuma trilha atrasada. Todos os prazos estão em dia."
            semCartao
          >
            <ul className={lista.atencoes}>
              {atrasadas.itens.map((item) => (
                <ItemAtencao
                  key={item.id}
                  tom="perigo"
                  icone={<AlertaIcon />}
                  texto={`${item.trilha.nome} · ${item.colaborador.nomeCompleto}`}
                  etiqueta={etiquetaDoAtraso(item)}
                  para={caminhoColaboradorNaTrilha(item.trilha.id, item.id)}
                />
              ))}
            </ul>
            {atrasadas.total > atrasadas.itens.length && (
              <VerTodas para={ACOMPANHAMENTO_ATRASADAS}>
                Ver todas as {atrasadas.total} atrasadas
              </VerTodas>
            )}
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
            {resumo &&
              (resumo.total === 0 ? (
                <p className={lista.nota}>
                  Ainda não há atribuições para resumir.
                </p>
              ) : (
                <ResumoStatus
                  resumo={resumo}
                  rotulos={ROTULOS_STATUS_PROGRESSO}
                  descricao="Atribuições por status"
                />
              ))}
          </PainelDashboard>

          <PainelDashboard
            titulo="Áreas com mais atraso"
            estado={estadoAreas}
            mensagemErro={erroAreas}
            mensagemVazia="Nenhuma área com atribuições atrasadas."
          >
            <AreasComAtraso itens={areasValidas ? areas : []} />
          </PainelDashboard>
        </div>
      </div>
    </div>
  )
}

/** Subtítulo da saudação com os números do dia. */
function descricaoGestao(
  resumo: ResumoStatusDashboard | undefined,
  taxa: number | undefined,
): string {
  const hoje = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  if (!resumo) return `Resumo das trilhas da equipe em ${hoje}.`
  if (resumo.total === 0) {
    return `Hoje, ${hoje}, ainda não há trilhas atribuídas à equipe.`
  }
  const partes = [
    resumo.atrasadas > 0
      ? `${resumo.atrasadas} ${plural(resumo.atrasadas, 'atribuição atrasada', 'atribuições atrasadas')}`
      : 'nenhuma atribuição atrasada',
    `${resumo.emAndamento} em andamento`,
  ]
  const conclusao =
    taxa !== undefined ? ` e ${formatarPercentual(taxa)}% de conclusão` : ''
  return `Hoje, ${hoje}: ${partes.join(', ')}${conclusao}.`
}

function etiquetaDoAtraso(item: AtribuicaoAcompanhamento): string {
  const partes = [textoDoAtraso(item.prazo)]
  if (item.prazo) partes.push(`prazo ${formatarData(item.prazo)}`)
  partes.push(`${item.percentual}% concluído`)
  if (item.area) partes.push(item.area.nome)
  return partes.join(' · ')
}

interface AtrasadasEstado {
  status: 'carregando' | 'pronto' | 'erro'
  itens: AtribuicaoAcompanhamento[]
  total: number
}

/** As atribuições atrasadas, da que venceu há mais tempo para a mais recente. */
function useAtribuicoesAtrasadas(): AtrasadasEstado {
  const [estado, setEstado] = useState<AtrasadasEstado>({
    status: 'carregando',
    itens: [],
    total: 0,
  })
  useEffect(() => {
    const controlador = new AbortController()
    listarAtribuicoes(
      { status: 'ATRASADA' },
      { page: 0, size: LIMITE_ATRASADAS, sort: 'prazo,asc' },
      { signal: controlador.signal },
    )
      .then((pagina) => {
        if (controlador.signal.aborted) return
        const itens = Array.isArray(pagina?.content) ? pagina.content : []
        const total =
          typeof pagina?.page?.totalElements === 'number'
            ? pagina.page.totalElements
            : itens.length
        setEstado({ status: 'pronto', itens, total })
      })
      .catch(() => {
        if (!controlador.signal.aborted) {
          setEstado({ status: 'erro', itens: [], total: 0 })
        }
      })
    return () => controlador.abort()
  }, [])
  return estado
}

function AreasComAtraso({
  itens,
}: {
  itens: DashboardGestaoResponse['areasComMaisAtraso']
}) {
  const maior = Math.max(0, ...itens.map((item) => item.atribuicoesAtrasadas))
  return (
    <ul className={lista.lista}>
      {itens.map((area) => (
        <li key={area.areaId} className={lista.linha}>
          <span className={lista.linhaCorpo}>
            <span className={lista.linhaTitulo}>{area.areaNome}</span>
            <span className={lista.linhaMeta}>
              {area.atribuicoesAtrasadas}{' '}
              {plural(
                area.atribuicoesAtrasadas,
                'atribuição atrasada',
                'atribuições atrasadas',
              )}
            </span>
          </span>
          <span className={lista.miniBarra} aria-hidden="true">
            <span
              className={`${lista.barraPreenchida} ${lista.barraPerigo}`}
              style={{
                width: `${maior > 0 ? (area.atribuicoesAtrasadas / maior) * 100 : 0}%`,
              }}
            />
          </span>
        </li>
      ))}
    </ul>
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
