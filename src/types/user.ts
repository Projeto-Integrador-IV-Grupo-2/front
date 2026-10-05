import type { RecursoResumo } from './usuario.ts'

/**
 * Perfis de acesso — espelham o enum `papel_usuario` do banco e o enum
 * `Perfil` da API (ADMIN, GESTOR, COLABORADOR).
 */
export type UserRole = 'ADMIN' | 'GESTOR' | 'COLABORADOR'

/**
 * Usuário autenticado, no formato devolvido por `POST /api/auth/login` e
 * `GET /api/auth/me` (record `MeResponse` da API). Os nomes acompanham a API,
 * que usa português no domínio.
 */
export interface User {
  id: string
  tenantId: string
  nomeCompleto: string
  email: string
  papel: UserRole
  /**
   * Área do usuário, usada nas recomendações de trilhas. Opcional porque o
   * `MeResponse` da API ainda não a devolve — sem ela, nada é recomendado.
   */
  area?: RecursoResumo | null
}
