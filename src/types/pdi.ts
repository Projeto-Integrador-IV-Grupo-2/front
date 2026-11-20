import type { TipoCompetencia } from './competencia.ts'
import type { ProgressoTrilha } from './trilha.ts'
import type { RecursoResumo } from './usuario.ts'

/** Espelha o enum `StatusPdi` da API. O PDI nasce `ATIVO`. */
export type StatusPdi = 'ATIVO' | 'CONCLUIDO' | 'CANCELADO'

/** Espelha o enum `TipoAcaoPdi` da API. */
export type TipoAcaoPdi = 'TRILHA' | 'MENTORIA' | 'OUTRO'

/** Espelha o enum `StatusAcaoPdi` da API. */
export type StatusAcaoPdi =
  'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'

/** Colaborador ou gestor de um PDI (record `PessoaResumo`). */
export interface PessoaResumo {
  id: string
  nomeCompleto: string
}

/** Linha de `GET /api/pdis` (record `PdiResumoResponse`). */
export interface PdiResumo {
  id: string
  colaborador: PessoaResumo
  gestor: PessoaResumo
  ciclo: string
  inicio: string
  fim: string
  status: StatusPdi
  /** Ações concluídas / total de ações, de 0 a 100. */
  percentual: number
  totalAcoes: number
  acoesConcluidas: number
  criadoEm: string
}

/**
 * Ação de uma competência do PDI (record `PdiAcaoResponse`). Numa ação
 * `TRILHA`, `trilha` e `progressoTrilha` vêm preenchidos; nas outras, nulos.
 */
export interface PdiAcao {
  id: string
  tipo: TipoAcaoPdi
  descricao: string | null
  trilha: RecursoResumo | null
  prazo: string | null
  status: StatusAcaoPdi
  concluidoEm: string | null
  progressoTrilha: ProgressoTrilha | null
}

/** Competência dentro do PDI (record `PdiItemResponse`). */
export interface PdiItem {
  id: string
  competencia: { id: string; nome: string; tipo: TipoCompetencia }
  nivelAtual: number
  nivelAlvo: number
  observacao: string | null
  acoes: PdiAcao[]
}

/** PDI completo (record `PdiDetalheResponse`) — detalhe e `GET /api/pdis/meu`. */
export interface PdiDetalhe extends PdiResumo {
  itens: PdiItem[]
}

/** Corpo de `POST /api/pdis`. O gestor é sempre quem cria. */
export interface CriarPdiRequest {
  colaboradorId: string
  ciclo: string
  inicio: string
  fim: string
}

/** Corpo de `POST /api/pdis/{id}/itens`. Níveis de 1 a 5. */
export interface PdiItemRequest {
  competenciaId: string
  nivelAtual: number
  nivelAlvo: number
  observacao: string | null
}

/** Corpo de `POST /api/pdis/{id}/itens/{itemId}/acoes` para ligar uma trilha. */
export interface LigarTrilhaRequest {
  tipo: 'TRILHA'
  trilhaId: string
  /** Opcional: sem ele vale o prazo definido na trilha. */
  prazo?: string
  descricao?: string | null
}

/** Opção do campo "Colaborador" (record `ColaboradorOpcaoResponse`). */
export interface ColaboradorOpcao {
  id: string
  nomeCompleto: string
  email: string
}

/** Paginação de `GET /api/pdis`. `page` é zero-based. */
export interface PdiPaginacao {
  page?: number
  size?: number
}

/** Níveis aceitos pela API — a tela só oferece estes. */
export const NIVEIS = [1, 2, 3, 4, 5] as const

export const ROTULOS_STATUS_PDI: Record<StatusPdi, string> = {
  ATIVO: 'Ativo',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}

export const ROTULOS_STATUS_ACAO: Record<StatusAcaoPdi, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}

export const ROTULOS_TIPO_ACAO: Record<TipoAcaoPdi, string> = {
  TRILHA: 'Trilha',
  MENTORIA: 'Mentoria',
  OUTRO: 'Outro',
}
