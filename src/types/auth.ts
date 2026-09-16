import type { User } from './user.ts'

/** Credenciais enviadas em `POST /api/auth/login` (record `LoginRequest` da API). */
export interface LoginRequest {
  email: string
  senha: string
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
