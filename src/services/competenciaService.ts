import axios from 'axios'
import { api } from './api.ts'
import type { ApiErrorResponse, ApiFieldError } from '../types/api.ts'
import type { Competencia, CompetenciaRequest } from '../types/competencia.ts'
import type { Pagina } from '../types/usuario.ts'

/**
 * Erro de competência já normalizado: a UI lê `message`, `status` e
 * `fieldErrors` sem conhecer o Axios. Mesmo formato de `AreaServiceError`.
 */
export class CompetenciaServiceError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldError[]

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'CompetenciaServiceError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function toServiceError(
  error: unknown,
  fallbackMessage: string,
): CompetenciaServiceError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status
    return new CompetenciaServiceError(
      mensagemPorStatus(status) ??
        error.response?.data?.message ??
        fallbackMessage,
      status,
      error.response?.data?.fieldErrors ?? [],
    )
  }
  return new CompetenciaServiceError(fallbackMessage)
}

/** 403 costuma vir sem corpo e a mensagem de um 5xx é técnica demais. */
function mensagemPorStatus(status: number | undefined): string | undefined {
  if (status === 403) {
    return 'Você não tem permissão para esta operação.'
  }
  if (status !== undefined && status >= 500) {
    return 'O servidor não conseguiu concluir a operação. Tente novamente em instantes.'
  }
  return undefined
}

/**
 * Competências ativas do tenant, para escolher ao montar um PDI. Uma página
 * grande basta: o catálogo é pequeno e a tela usa um select.
 */
export async function listarCompetencias(config?: {
  signal?: AbortSignal
}): Promise<Competencia[]> {
  try {
    const { data } = await api.get<Pagina<Competencia>>('/api/competencias', {
      params: { page: 0, size: 200, sort: 'nome' },
      signal: config?.signal,
    })
    return data.content
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar as competências.')
  }
}

export async function criarCompetencia(
  request: CompetenciaRequest,
): Promise<Competencia> {
  try {
    const { data } = await api.post<Competencia>('/api/competencias', request)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível criar a competência.')
  }
}
