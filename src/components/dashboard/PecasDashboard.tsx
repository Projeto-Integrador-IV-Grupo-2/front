import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ResumoStatusDashboard } from '../../types/dashboard.ts'
import type { StatusProgresso } from '../../types/trilha.ts'
import lista from './ListaDashboard.module.css'

/**
 * Peças visuais da visão geral, compartilhadas pelos painéis de gestão e do
 * colaborador: cartão de indicador com ícone, resumo por status com barra
 * segmentada, item de "Precisa de atenção" e selo do cabeçalho.
 */

export type Tom = 'azul' | 'roxo' | 'ciano' | 'verde' | 'alerta' | 'perigo'

const CLASSE_TOM: Record<Tom, string> = {
  azul: lista.tomAzul,
  roxo: lista.tomRoxo,
  ciano: lista.tomCiano,
  verde: lista.tomVerde,
  alerta: lista.tomAlerta,
  perigo: lista.tomPerigo,
}

export function CartaoIndicador({
  icone,
  tom,
  valor,
  rotulo,
  progresso,
}: {
  icone: ReactNode
  tom: Tom
  valor: ReactNode
  rotulo: string
  /** 0 a 100: mostra a barra embaixo (ex.: taxa de conclusão). */
  progresso?: number
}) {
  return (
    <div className={`${lista.indicador} ${CLASSE_TOM[tom]}`}>
      <span className={lista.indicadorIcone}>{icone}</span>
      <strong className={lista.indicadorValor}>{valor}</strong>
      <span className={lista.indicadorRotulo}>{rotulo}</span>
      {progresso !== undefined && (
        <span className={lista.indicadorBarra} aria-hidden="true">
          <span
            style={{ width: `${Math.min(100, Math.max(0, progresso))}%` }}
          />
        </span>
      )}
    </div>
  )
}

/** Grade dos quatro indicadores, com os estados de carregamento e erro. */
export function GradeIndicadores({
  titulo,
  carregando,
  erro,
  children,
}: {
  titulo: string
  carregando: boolean
  erro?: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby="painel-indicadores" aria-busy={carregando}>
      <h3 id="painel-indicadores" className="visually-hidden">
        {titulo}
      </h3>
      {carregando ? (
        <p className={lista.gradeEstado} role="status">
          Carregando…
        </p>
      ) : erro ? (
        <p className={`${lista.gradeEstado} ${lista.gradeErro}`} role="alert">
          {erro}
        </p>
      ) : (
        <div className={lista.grade}>{children}</div>
      )}
    </section>
  )
}

const ITENS_STATUS: Array<{
  chave: keyof Omit<ResumoStatusDashboard, 'total'>
  status: StatusProgresso
  classe: string
}> = [
  { chave: 'naoIniciadas', status: 'NAO_INICIADA', classe: lista.corNeutra },
  { chave: 'emAndamento', status: 'EM_ANDAMENTO', classe: lista.corPrimaria },
  { chave: 'concluidas', status: 'CONCLUIDA', classe: lista.corSucesso },
  { chave: 'atrasadas', status: 'ATRASADA', classe: lista.corPerigo },
]

/**
 * Barra segmentada (um pedaço por status, proporcional) e a lista com as
 * contagens. `rotulos` traz o nome de cada status como a tela fala dele.
 */
export function ResumoStatus({
  resumo,
  rotulos,
  descricao,
}: {
  resumo: ResumoStatusDashboard
  rotulos: Record<StatusProgresso, string>
  /** Nome do grupo para leitores de tela, ex.: "Atribuições por status". */
  descricao: string
}) {
  return (
    <div
      role="group"
      aria-label={
        `${descricao}: ` +
        ITENS_STATUS.map(
          (item) => `${rotulos[item.status]}: ${resumo[item.chave]}`,
        ).join('; ') +
        `. Total: ${resumo.total}.`
      }
      className={lista.resumo}
    >
      <p className={lista.resumoTotal} aria-hidden="true">
        <strong>{resumo.total}</strong> no total
      </p>
      <div className={lista.segmentos} aria-hidden="true">
        {resumo.total === 0 ? (
          <span className={lista.segmentoVazio} />
        ) : (
          ITENS_STATUS.filter((item) => resumo[item.chave] > 0).map((item) => (
            <span
              key={item.chave}
              className={item.classe}
              style={{ flexGrow: resumo[item.chave] }}
            />
          ))
        )}
      </div>
      <ul className={lista.legenda}>
        {ITENS_STATUS.map((item) => (
          <li key={item.chave}>
            <span
              className={`${lista.ponto} ${item.classe}`}
              aria-hidden="true"
            />
            <span className={lista.legendaRotulo}>{rotulos[item.status]}</span>
            <span className={lista.legendaPercentual}>
              {resumo.total > 0
                ? `${Math.round((resumo[item.chave] / resumo.total) * 100)}%`
                : '0%'}
            </span>
            <strong>{resumo[item.chave]}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Item de "Precisa de atenção": um cartão que leva a quem resolve. */
export function ItemAtencao({
  tom,
  icone,
  texto,
  etiqueta,
  para,
}: {
  tom: Tom
  icone: ReactNode
  texto: string
  etiqueta: string
  para: string
}) {
  return (
    <li>
      <Link to={para} className={`${lista.atencao} ${CLASSE_TOM[tom]}`}>
        <span className={lista.atencaoIcone}>{icone}</span>
        <span className={lista.atencaoCorpo}>
          <span className={lista.atencaoTexto}>{texto}</span>
          <span className={lista.atencaoEtiqueta}>{etiqueta}</span>
        </span>
        <ChevronIcon />
      </Link>
    </li>
  )
}

/** Link "Ver todas" no pé de uma lista do dashboard. */
export function VerTodas({
  para,
  children,
}: {
  para: string
  children: ReactNode
}) {
  return (
    <Link to={para} className={lista.verTodas}>
      {children}
    </Link>
  )
}

/** Selo do cabeçalho: "2 trilhas atrasadas". Some quando é zero. */
export function SeloCabecalho({ texto }: { texto: string | null }) {
  if (!texto) return null
  return (
    <span className={lista.seloCabecalho}>
      <span className={lista.seloPonto} aria-hidden="true" />
      {texto}
    </span>
  )
}

/** Cabeçalho da visão geral: saudação à esquerda, selo à direita. */
export function TopoDashboard({
  saudacao,
  selo,
}: {
  saudacao: ReactNode
  selo: string | null
}) {
  return (
    <div className={lista.topo}>
      {saudacao}
      <SeloCabecalho texto={selo} />
    </div>
  )
}

function Icone({ children }: { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function TrilhaIcon() {
  return (
    <Icone>
      <circle cx="5" cy="5" r="2" />
      <circle cx="15" cy="10" r="2" />
      <circle cx="5" cy="15" r="2" />
      <path d="M7 5.5l6 3.5M7 14.5l6-3.5" />
    </Icone>
  )
}

export function ListaIcon() {
  return (
    <Icone>
      <rect x="4" y="3" width="12" height="14" rx="2" />
      <path d="M7.5 7.5h5M7.5 10.5h5M7.5 13.5h3" />
    </Icone>
  )
}

export function PlayIcon() {
  return (
    <Icone>
      <circle cx="10" cy="10" r="7" />
      <path d="M8.5 7.5v5l4-2.5-4-2.5z" />
    </Icone>
  )
}

export function CheckIcon() {
  return (
    <Icone>
      <circle cx="10" cy="10" r="7" />
      <path d="M7 10.2l2 2 4-4.2" />
    </Icone>
  )
}

export function RelogioIcon() {
  return (
    <Icone>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.5V10l2.5 1.5" />
    </Icone>
  )
}

export function AlertaIcon() {
  return (
    <Icone>
      <path d="M10 3.5l7 12.5H3L10 3.5z" />
      <path d="M10 8.5v3M10 14h.01" />
    </Icone>
  )
}

export function AreaIcon() {
  return (
    <Icone>
      <path d="M10 2.5l7 3.5-7 3.5-7-3.5 7-3.5z" />
      <path d="M3 10l7 3.5 7-3.5M3 13.5l7 3.5 7-3.5" />
    </Icone>
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
