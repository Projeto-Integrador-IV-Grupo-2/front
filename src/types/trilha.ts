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

/**
 * Filtros de `GET /api/trilhas` (record `TrilhaFiltro` da API), todos
 * opcionais e combinados com E. Valem também para `GET /api/areas/{id}/trilhas`.
 */
export interface TrilhaFiltro {
  /** Trecho do nome, sem diferenciar maiúsculas. */
  nome?: string
  areaId?: string
  /**
   * Status do progresso do próprio usuário. `NAO_INICIADA` inclui as trilhas
   * que ele nunca iniciou; prazo vencido conta como `ATRASADA`.
   */
  status?: StatusProgresso | ''
  /** Só as trilhas que o usuário iniciou ou recebeu (aceita `sort=prazo`). */
  minhas?: boolean
  /** Coloca as trilhas da área do usuário primeiro. */
  recomendar?: 'AREA'
}

/** Paginação e ordenação de `GET /api/trilhas`. `page` é zero-based. */
export interface TrilhaPaginacao {
  page?: number
  size?: number
  sort?: string
}

/**
 * Corpo de `POST /api/trilhas`. Só o nome é obrigatório: `descricao`,
 * `areaId`, `prazoDias` e `objetivos` são opcionais no banco.
 */
export interface CriarTrilhaRequest {
  nome: string
  descricao: string | null
  areaId: string | null
  prazoDias: number | null
  objetivos: string | null
}

/**
 * Corpo de `PUT /api/trilhas/{id}`. A edição manda a trilha inteira, com os
 * mesmos campos do cadastro — por isso o tipo é o mesmo, e não uma cópia que
 * pode divergir. Nome duplicado no tenant volta 409.
 *
 * `ativo` fica de fora de propósito, como no record da API: a situação só
 * muda pelos endpoints de inativar e ativar.
 */
export type AtualizarTrilhaRequest = CriarTrilhaRequest

/**
 * Corpo de `POST /api/trilhas/{id}/atribuicoes`: a trilha vai para uma lista
 * de colaboradores **ou** para todos os de uma área — nunca os dois ao mesmo
 * tempo. `prazo` é a data limite (`LocalDate`); nulo usa o prazo da trilha.
 */
export type AtribuirTrilhaRequest =
  | { usuarioIds: string[]; areaId?: never; prazo: string | null }
  | { areaId: string; usuarioIds?: never; prazo: string | null }

/**
 * Resposta da atribuição em lote (record `AtribuicaoEmLoteResponse`): quem já
 * tinha a trilha é ignorado em vez de duplicado, e a API diz quantos foram
 * cada coisa. `usuarioIds` traz quem passou a ter a trilha agora — a tela
 * ainda não precisa deles, mas eles fazem parte do contrato.
 */
export interface ResultadoAtribuicao {
  atribuidos: number
  ignorados: number
  usuarioIds: string[]
}

/** Ordem dos status nos selects de filtro. */
export const STATUS_PROGRESSO: StatusProgresso[] = [
  'NAO_INICIADA',
  'EM_ANDAMENTO',
  'CONCLUIDA',
  'ATRASADA',
]

/** Rótulos de status em um lugar só — listagem e detalhe leem daqui. */
export const ROTULOS_STATUS_PROGRESSO: Record<StatusProgresso, string> = {
  NAO_INICIADA: 'Não iniciada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  ATRASADA: 'Atrasada',
}
