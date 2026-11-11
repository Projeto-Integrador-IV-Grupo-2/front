import { api } from './api.ts'
import { normalizarErro } from '../utils/errorHandler.ts'
import type { ApiFieldError } from '../types/api.ts'
import type {
  AtualizarPerfilRequest,
  MeResponse,
  TrocarSenhaRequest,
} from '../types/perfil.ts'

/**
 * Erro do perfil já normalizado: a tela lê `message` e `fieldErrors` sem
 * conhecer o Axios. Nada do corpo enviado (as senhas, em especial) entra aqui.
 */
export class PerfilServiceError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldError[]

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'PerfilServiceError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function toServiceError(
  error: unknown,
  fallbackMessage: string,
): PerfilServiceError {
  const { message, status, fieldErrors } = normalizarErro(
    error,
    fallbackMessage,
  )
  return new PerfilServiceError(message, status, fieldErrors)
}

export async function buscarPerfil(config?: {
  signal?: AbortSignal
}): Promise<MeResponse> {
  try {
    const { data } = await api.get<MeResponse>('/api/auth/me', config)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar o seu perfil.')
  }
}

/** Salva o nome e devolve o perfil atualizado, como a API o gravou. */
export async function atualizarPerfil(
  request: AtualizarPerfilRequest,
): Promise<MeResponse> {
  try {
    const { data } = await api.put<MeResponse>('/api/auth/me', request)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível salvar o seu nome.')
  }
}

/**
 * Senha atual errada precisa voltar como 400 (com `fieldErrors`), nunca 401:
 * o interceptor do `api` trata 401 como sessão vencida e desloga.
 */
export async function trocarSenha(request: TrocarSenhaRequest): Promise<void> {
  try {
    await api.patch('/api/auth/me/senha', request)
  } catch (error) {
    throw toServiceError(error, 'Não foi possível trocar a senha.')
  }
}
