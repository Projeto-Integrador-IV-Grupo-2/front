import axios from 'axios'
import { api } from './api.ts'
import type { ApiErrorResponse } from '../types/api.ts'
import type { LoginRequest, LoginResponse } from '../types/auth.ts'
import type { User } from '../types/user.ts'

/** Erro de autenticação normalizado — a UI nunca precisa lidar com Axios. */
export class AuthError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

function toAuthError(error: unknown, fallbackMessage: string): AuthError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return new AuthError(
      error.response?.data?.message ?? fallbackMessage,
      error.response?.status,
    )
  }
  return new AuthError(fallbackMessage)
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
