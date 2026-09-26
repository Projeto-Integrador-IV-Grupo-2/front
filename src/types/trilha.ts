import type { RecursoResumo } from './usuario.ts'

/**
 * Status do progresso do usuário numa trilha — espelha o enum
 * `StatusAtribuicao` da API (tabela `trilha_atribuicao`).
 */
export type StatusProgresso =
  'NAO_INICIADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'ATRASADA'

/**
 * Progresso do usuário autenticado numa trilha (record
 * `ProgressoTrilhaResponse`). `id` nulo quer dizer que ainda não existe
 * atribuição persistida — o usuário nunca iniciou a trilha.
 */
export interface ProgressoTrilha {
  id: string | null
  trilha: RecursoResumo
  status: StatusProgresso
  percentual: number
  prazo: string | null
  atribuidoEm: string | null
  concluidoEm: string | null
}

/**
 * Trilha na listagem (record `TrilhaResumoResponse`). A API hoje devolve só
 * `id`, `nome` e `area`; `objetivos` e `progresso` são opcionais porque o
 * card pede o progresso na listagem "quando a API expuser esse dado" — a tela
 * já mostra os dois quando vierem e se vira sem eles enquanto não vêm.
 */
export interface TrilhaResumo {
  id: string
  nome: string
  area: RecursoResumo | null
  objetivos?: string | null
  progresso?: ProgressoTrilha | null
}

/**
 * Detalhe da trilha + progresso do usuário autenticado (record
 * `TrilhaDetalheResponse` de `GET /api/trilhas/{id}`). O progresso sempre
 * vem: quem nunca iniciou recebe `NAO_INICIADA` com `id` nulo, não 404.
 */
export interface TrilhaDetalhe {
  id: string
  nome: string
  descricao: string | null
  area: RecursoResumo | null
  objetivos: string | null
  prazoDias: number | null
  ativo: boolean
  criadoEm: string
  progresso: ProgressoTrilha
}

/**
 * Corpo da atualização de progresso (record `AtualizarProgressoRequest`): só o
 * status muda. `NAO_INICIADA` não é aceito — progresso iniciado não volta.
 */
export interface AtualizarProgressoRequest {
  status: Exclude<StatusProgresso, 'NAO_INICIADA'>
}

/** Paginação e ordenação de `GET /api/trilhas`. `page` é zero-based. */
export interface TrilhaPaginacao {
  page?: number
  size?: number
  sort?: string
}

/** Corpo de `POST /api/trilhas`. `prazoDias` e `areaId` são opcionais no banco. */
export interface CriarTrilhaRequest {
  nome: string
  areaId: string | null
  prazoDias: number | null
  objetivos: string | null
}

/** Rótulos de status em um lugar só — listagem e detalhe leem daqui. */
export const ROTULOS_STATUS_PROGRESSO: Record<StatusProgresso, string> = {
  NAO_INICIADA: 'Não iniciada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  ATRASADA: 'Atrasada',
}
