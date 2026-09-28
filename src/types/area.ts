/**
 * Área no formato do record `AreaResponse` da API (Back Card 01/04). Segue o
 * DER: `area` só tem `nome`/`ativo` — sem responsável nem área superior, que
 * não existem no modelo. `totalPessoas`/`totalConteudos` são contagens de
 * `usuario.area_id`/`conteudo.area_id` (DER) que o back ainda vai precisar
 * expor — a Card 04 de hoje não lista esses campos na resposta.
 */
export interface Area {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
  totalPessoas: number
  totalConteudos: number
  criadoEm: string
  atualizadoEm: string
}

/**
 * Página do Spring (`PagedModel`): a lista vem em `content` e os contadores em
 * `page`. `number` é zero-based. Mesmo formato usado por `GET /api/usuarios`.
 */
export interface Pagina<T> {
  content: T[]
  page: {
    size: number
    number: number
    totalElements: number
    totalPages: number
  }
}

/** Filtro aceito por `GET /api/areas`. */
export interface AreaFiltro {
  nome?: string
}

/** Paginação e ordenação de `GET /api/areas`. `page` é zero-based. */
export interface AreaPaginacao {
  page?: number
  size?: number
  sort?: string
}

/** Corpo de `POST /api/areas` (record `CriarAreaRequest`). */
export interface CriarAreaRequest {
  nome: string
  descricao: string | null
}

/** Corpo de `PUT /api/areas/{id}` (record `AtualizarAreaRequest`). */
export interface AtualizarAreaRequest {
  nome: string
  descricao: string | null
}
