import { api } from './api.ts'
import { normalizarErro } from '../utils/errorHandler.ts'
import type { ApiFieldError } from '../types/api.ts'
import type { Pagina } from '../types/area.ts'
import type {
  Conteudo,
  ConteudoFiltro,
  ConteudoRequest,
} from '../types/conteudo.ts'

/**
 * Erro de conteúdo já normalizado. Link inválido do Vimeo chega como 400 com
 * `fieldErrors[{ field: 'videoUrl' }]`, que o formulário mostra no campo.
 */
export class ConteudoServiceError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldError[]

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'ConteudoServiceError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function toServiceError(
  error: unknown,
  fallbackMessage: string,
): ConteudoServiceError {
  const { message, status, fieldErrors } = normalizarErro(
    error,
    fallbackMessage,
  )
  return new ConteudoServiceError(message, status, fieldErrors)
}

/** Campo vazio não vira parâmetro: `?tipo=` faria a API recusar o filtro. */
function apenasPreenchidos(filtro: ConteudoFiltro): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filtro).filter(
      ([, valor]) => valor !== undefined && valor !== '',
    ),
  ) as Record<string, string>
}

export async function listarConteudos(
  filtro: ConteudoFiltro = {},
  { page = 0, size = 20 }: { page?: number; size?: number } = {},
  config?: { signal?: AbortSignal },
): Promise<Pagina<Conteudo>> {
  try {
    const { data } = await api.get<Pagina<Conteudo>>('/api/conteudos', {
      params: { ...apenasPreenchidos(filtro), page, size, sort: 'titulo' },
      signal: config?.signal,
    })
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar os conteúdos.')
  }
}

export async function criarConteudo(
  request: ConteudoRequest,
): Promise<Conteudo> {
  try {
    const { data } = await api.post<Conteudo>('/api/conteudos', request)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível cadastrar o conteúdo.')
  }
}

export async function atualizarConteudo(
  id: string,
  request: ConteudoRequest,
): Promise<Conteudo> {
  try {
    const { data } = await api.put<Conteudo>(`/api/conteudos/${id}`, request)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível salvar o conteúdo.')
  }
}

export async function publicarConteudo(id: string): Promise<Conteudo> {
  try {
    const { data } = await api.patch<Conteudo>(`/api/conteudos/${id}/publicar`)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível publicar o conteúdo.')
  }
}
