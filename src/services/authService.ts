import { api } from './api.ts'
import { normalizarErro } from '../utils/errorHandler.ts'
import type { ApiFieldError } from '../types/api.ts'
import type { LoginRequest, LoginResponse } from '../types/auth.ts'
import type { User } from '../types/user.ts'

/** Erro de autenticação normalizado — a UI nunca precisa lidar com Axios. */
export class AuthError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldError[]

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'AuthError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function toAuthError(error: unknown, fallbackMessage: string): AuthError {
  const { message, status, fieldErrors } = normalizarErro(
    error,
    fallbackMessage,
  )
  return new AuthError(message, status, fieldErrors)
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    const { data } = await api.post<LoginResponse>(
      '/api/auth/login',
      credentials,
    )
    return data
  } catch (error) {
    throw toAuthError(error, 'Não foi possível entrar. Tente novamente.')
  }
}

export async function fetchCurrentUser(config?: {
  signal?: AbortSignal
}): Promise<User> {
  try {
    const { data } = await api.get<User>('/api/auth/me', config)
    return data
  } catch (error) {
    throw toAuthError(error, 'Não foi possível carregar os dados do usuário.')
  }
}

/**
 * Pede o link de redefinição de senha. A API responde igual exista ou não a
 * conta (204), então não há o que devolver: a tela mostra sempre a mesma
 * mensagem. Passar do limite de pedidos chega como `AuthError` com status 429.
 */
export async function esqueciSenha(email: string): Promise<void> {
  try {
    await api.post('/api/auth/esqueci-senha', { email })
  } catch (error) {
    throw toAuthError(
      error,
      'Não foi possível enviar o pedido. Tente novamente em instantes.',
    )
  }
}

/**
 * Troca a senha com o token do link. Link inválido ou expirado chega como
 * `AuthError` 400 sem `fieldErrors`; senha fora da regra, 400 com o erro no
 * campo `novaSenha`.
 */
export async function redefinirSenha(
  token: string,
  novaSenha: string,
): Promise<void> {
  try {
    await api.post('/api/auth/redefinir-senha', { token, novaSenha })
  } catch (error) {
    throw toAuthError(error, 'Não foi possível redefinir a senha.')
  }
}
