import { api } from './api.ts'
import { normalizarErro } from '../utils/errorHandler.ts'
import type { ApiFieldError } from '../types/api.ts'
import type { Pagina } from '../types/area.ts'
import type { Categoria, CategoriaRequest } from '../types/conteudo.ts'

/** Erro de categoria já normalizado — mesmo formato de `AreaServiceError`. */
export class CategoriaServiceError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldError[]

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'CategoriaServiceError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function toServiceError(
  error: unknown,
  fallbackMessage: string,
): CategoriaServiceError {
  const { message, status, fieldErrors } = normalizarErro(
    error,
    fallbackMessage,
  )
  return new CategoriaServiceError(message, status, fieldErrors)
}

export async function listarCategorias(
  {
    nome,
    page = 0,
    size = 20,
  }: { nome?: string; page?: number; size?: number } = {},
  config?: { signal?: AbortSignal },
): Promise<Pagina<Categoria>> {
  try {
    const { data } = await api.get<Pagina<Categoria>>('/api/categorias', {
      params: { ...(nome ? { nome } : {}), page, size, sort: 'nome' },
      signal: config?.signal,
    })
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar as categorias.')
  }
}

export async function criarCategoria(
  request: CategoriaRequest,
): Promise<Categoria> {
  try {
    const { data } = await api.post<Categoria>('/api/categorias', request)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível cadastrar a categoria.')
  }
}

export async function atualizarCategoria(
  id: string,
  request: CategoriaRequest,
): Promise<Categoria> {
  try {
    const { data } = await api.put<Categoria>(`/api/categorias/${id}`, request)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível salvar a categoria.')
  }
}
