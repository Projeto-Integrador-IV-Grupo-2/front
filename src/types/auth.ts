import type { User, UserRole } from './user.ts'

/** Credenciais enviadas em `POST /api/auth/login` (record `LoginRequest` da API). */
export interface LoginRequest {
  email: string
  senha: string
}

/**
 * A conta entrou, mas não é do perfil escolhido na tela de login (ex.: um
 * administrador com "Colaborador" marcado). A sessão não é aberta.
 */
export class PerfilDiferenteError extends Error {
  readonly papel: UserRole

  constructor(papel: UserRole) {
    super('A conta não é do perfil escolhido.')
    this.name = 'PerfilDiferenteError'
    this.papel = papel
  }
}

/**
 * Resposta do login (record `LoginResponse` da API).
 *
 * `expiraEm` é um instante ISO-8601: a aplicação encerra a sessão sozinha
 * quando esse momento passa, sem esperar o primeiro 401.
 */
export interface LoginResponse {
  token: string
  tipo: string
  expiraEm: string
  usuario: User
}
