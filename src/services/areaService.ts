import axios from 'axios'
import { api } from './api.ts'
import type { ApiErrorResponse, ApiFieldError } from '../types/api.ts'
import type {
  Area,
  AreaFiltro,
  AreaPaginacao,
  AtualizarAreaRequest,
  CriarAreaRequest,
  Pagina,
} from '../types/area.ts'

/**
 * Erro de área já normalizado: a UI lê `message` e `fieldErrors` sem
 * precisar conhecer o Axios. Mesmo formato de `UsuarioServiceError`.
 */
export class AreaServiceError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldError[]

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'AreaServiceError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function toServiceError(
  error: unknown,
  fallbackMessage: string,
): AreaServiceError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status
    return new AreaServiceError(
      error.response?.data?.message ??
        mensagemPorStatus(status, fallbackMessage),
      status,
      error.response?.data?.fieldErrors ?? [],
    )
  }
  return new AreaServiceError(fallbackMessage)
}

/**
 * O 403 é o único status com mensagem própria: o backend costuma respondê-lo
 * sem corpo, e "sem permissão" é mais útil do que o texto genérico da operação.
 */
function mensagemPorStatus(
  status: number | undefined,
  fallbackMessage: string,
): string {
  if (status === 403) {
    return 'Você não tem permissão para esta operação.'
  }
  return fallbackMessage
}

/** Campo vazio não vira parâmetro: `?nome=` faria a API filtrar por string vazia. */
function apenasPreenchidos(filtro: AreaFiltro): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filtro).filter(
      ([, valor]) => valor !== undefined && valor !== '',
    ),
  ) as Record<string, string>
}

export async function listarAreas(
  filtro: AreaFiltro = {},
  paginacao: AreaPaginacao = {},
  config?: { signal?: AbortSignal },
): Promise<Pagina<Area>> {
  try {
    const { data } = await api.get<Pagina<Area>>('/api/areas', {
      params: {
        ...apenasPreenchidos(filtro),
        page: paginacao.page ?? 0,
        size: paginacao.size ?? 20,
        sort: paginacao.sort ?? 'nome',
      },
      signal: config?.signal,
    })
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar as áreas.')
  }
}

export async function criarArea(request: CriarAreaRequest): Promise<Area> {
  try {
    const { data } = await api.post<Area>('/api/areas', request)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível cadastrar a área.')
  }
}

export async function atualizarArea(
  id: string,
  request: AtualizarAreaRequest,
): Promise<Area> {
  try {
    const { data } = await api.put<Area>(`/api/areas/${id}`, request)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível salvar as alterações.')
  }
}

export async function inativarArea(id: string): Promise<Area> {
  try {
    const { data } = await api.patch<Area>(`/api/areas/${id}/inativar`)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível inativar a área.')
  }
}

export async function ativarArea(id: string): Promise<Area> {
  try {
    const { data } = await api.patch<Area>(`/api/areas/${id}/ativar`)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível reativar a área.')
  }
}
