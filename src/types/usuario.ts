import type { UserRole } from './user.ts'

/** Situação do usuário — espelha o enum `SituacaoUsuario` da API. */
export type SituacaoUsuario = 'ATIVO' | 'INATIVO'

/** Resumo de um recurso de catálogo (Cargo ou Área), como a API devolve. */
export interface RecursoResumo {
  id: string
  nome: string
}

/** Usuário no formato do record `UsuarioResponse` da API. */
export interface Usuario {
  id: string
  nomeCompleto: string
  email: string
  cargo: RecursoResumo | null
  area: RecursoResumo | null
  papel: UserRole
  situacao: SituacaoUsuario
  dataEntrada: string
  criadoEm: string
  atualizadoEm: string
}

/**
 * Página do Spring (`PagedModel`): a lista vem em `content` e os contadores em
 * `page`. `number` é zero-based.
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

/** Filtros aceitos por `GET /api/usuarios` (record `UsuarioFiltro` da API). */
export interface UsuarioFiltro {
  nome?: string
  email?: string
  /** Área do usuário, pelo id (o filtro é uma seleção das áreas cadastradas). */
  areaId?: string
  perfil?: UserRole | ''
  situacao?: SituacaoUsuario | ''
}

/** Paginação e ordenação de `GET /api/usuarios`. `page` é zero-based. */
export interface UsuarioPaginacao {
  page?: number
  size?: number
  sort?: string
}

/** Corpo de `POST /api/usuarios` (record `CriarUsuarioRequest`). */
export interface CriarUsuarioRequest {
  nomeCompleto: string
  email: string
  senha: string
  papel: UserRole
  cargoId: string | null
  areaId: string | null
  dataEntrada: string
}

/** Corpo de `PUT /api/usuarios/{id}` (record `AtualizarUsuarioRequest`). */
export interface AtualizarUsuarioRequest {
  nomeCompleto: string
  cargoId: string | null
  areaId: string | null
  papel: UserRole
}

/** Rótulos de perfil e situação em um lugar só — tabela, filtros e formulário leem daqui. */
export const ROTULOS_PERFIL: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  COLABORADOR: 'Colaborador',
}

export const ROTULOS_SITUACAO: Record<SituacaoUsuario, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
}

export const PERFIS: UserRole[] = ['ADMIN', 'GESTOR', 'COLABORADOR']
/** Perfis oferecidos no filtro de Usuários: a empresa só usa admin e colaborador. */
export const PERFIS_NO_FILTRO: UserRole[] = ['ADMIN', 'COLABORADOR']
export const SITUACOES: SituacaoUsuario[] = ['ATIVO', 'INATIVO']
