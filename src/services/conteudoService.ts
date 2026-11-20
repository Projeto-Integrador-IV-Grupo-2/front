import { api } from './api.ts'
import { avisarConteudosMudaram } from './conteudoEvents.ts'
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

export async function buscarConteudo(
  id: string,
  config?: { signal?: AbortSignal },
): Promise<Conteudo> {
  try {
    const { data } = await api.get<Conteudo>(`/api/conteudos/${id}`, {
      signal: config?.signal,
    })
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar o conteúdo.')
  }
}

export async function criarConteudo(
  request: ConteudoRequest,
): Promise<Conteudo> {
  try {
    const { data } = await api.post<Conteudo>('/api/conteudos', request)
    avisarConteudosMudaram()
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
    avisarConteudosMudaram()
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível salvar o conteúdo.')
  }
}

export async function publicarConteudo(id: string): Promise<Conteudo> {
  try {
    const { data } = await api.patch<Conteudo>(`/api/conteudos/${id}/publicar`)
    avisarConteudosMudaram()
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível publicar o conteúdo.')
  }
}

/**
 * Volta o conteúdo para rascunho. Conteúdo usado em etapa de trilha responde
 * 409, e a mensagem da API é a que a tela mostra.
 */
/** Exclui de vez. Conteúdo usado em etapa de trilha responde 409. */
export async function excluirConteudo(id: string): Promise<void> {
  try {
    await api.delete(`/api/conteudos/${id}`)
    avisarConteudosMudaram()
  } catch (error) {
    throw toServiceError(error, 'Não foi possível excluir o conteúdo.')
  }
}

export async function despublicarConteudo(id: string): Promise<Conteudo> {
  try {
    const { data } = await api.patch<Conteudo>(
      `/api/conteudos/${id}/despublicar`,
    )
    avisarConteudosMudaram()
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível despublicar o conteúdo.')
  }
}
