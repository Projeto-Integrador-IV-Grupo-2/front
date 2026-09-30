/**
 * Área no formato do record `AreaResponse` da API (Back Card 01/04). Segue o
 * DER: sem responsável nem área superior, que não existem no modelo.
 * `totalPessoas` conta `usuario.area_id`; `totalConteudos` vem sempre 0 até a
 * tabela `conteudo` existir no backend.
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
  /** Sem ele a API devolve só as ativas — a tela de gestão precisa das inativas para reativá-las. */
  incluirInativas?: boolean
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
