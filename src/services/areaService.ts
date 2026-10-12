import { api } from './api.ts'
import { normalizarErro } from '../utils/errorHandler.ts'
import type { ApiFieldError } from '../types/api.ts'
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
  // Sem textos próprios: a mensagem da API vale, e o `errorHandler` cobre o
  // 403 que chega sem corpo.
  const { message, status, fieldErrors } = normalizarErro(
    error,
    fallbackMessage,
  )
  return new AreaServiceError(message, status, fieldErrors)
}

/** Campo vazio não vira parâmetro: `?nome=` faria a API filtrar por string vazia. */
function apenasPreenchidos(
  filtro: AreaFiltro,
): Record<string, string | boolean> {
  return Object.fromEntries(
    Object.entries(filtro).filter(
      ([, valor]) => valor !== undefined && valor !== '',
    ),
  ) as Record<string, string | boolean>
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
