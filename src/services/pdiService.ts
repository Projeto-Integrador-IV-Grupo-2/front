import axios from 'axios'
import { api } from './api.ts'
import type { ApiErrorResponse, ApiFieldError } from '../types/api.ts'
import type {
  ColaboradorOpcao,
  CriarPdiRequest,
  LigarTrilhaRequest,
  PdiAcao,
  PdiDetalhe,
  PdiItem,
  PdiItemRequest,
  PdiPaginacao,
  PdiResumo,
} from '../types/pdi.ts'
import type { Pagina } from '../types/usuario.ts'

/**
 * Erro do PDI já normalizado: a UI lê `message`, `status` e `fieldErrors`
 * sem conhecer o Axios. A mensagem da API tem prioridade (ex.: "Fulano já tem
 * um PDI no ciclo 2026"); o texto padrão só entra quando ela não vem.
 */
export class PdiServiceError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldError[]

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'PdiServiceError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function toServiceError(
  error: unknown,
  fallbackMessage: string,
): PdiServiceError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status
    return new PdiServiceError(
      mensagemPorStatus(status) ??
        error.response?.data?.message ??
        fallbackMessage,
      status,
      error.response?.data?.fieldErrors ?? [],
    )
  }
  return new PdiServiceError(fallbackMessage)
}

/**
 * 404 ganha texto próprio: PDI de outra equipe ou de outro tenant também
 * volta 404 (nunca 403), e o id da mensagem da API não ajuda ninguém. 403
 * costuma vir sem corpo e a mensagem de um 5xx é técnica demais.
 */
function mensagemPorStatus(status: number | undefined): string | undefined {
  if (status === 404) {
    return 'PDI não encontrado. Ele pode ter sido removido ou não estar disponível para você.'
  }
  if (status === 403) {
    return 'Você não tem permissão para esta operação.'
  }
  if (status !== undefined && status >= 500) {
    return 'O servidor não conseguiu concluir a operação. Tente novamente em instantes.'
  }
  return undefined
}

/**
 * PDI ativo do usuário autenticado. Não ter PDI ativo é um estado normal da
 * tela (a API responde 404), então volta `null` em vez de erro.
 */
export async function buscarMeuPdi(config?: {
  signal?: AbortSignal
}): Promise<PdiDetalhe | null> {
  try {
    const { data } = await api.get<PdiDetalhe>('/api/pdis/meu', {
      signal: config?.signal,
    })
    return data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null
    }
    throw toServiceError(error, 'Não foi possível carregar o seu PDI.')
  }
}

/** PDIs que o usuário pode ver — para o gestor, os da equipe dele. */
export async function listarPdis(
  paginacao: PdiPaginacao = {},
  config?: { signal?: AbortSignal },
): Promise<Pagina<PdiResumo>> {
  try {
    const { data } = await api.get<Pagina<PdiResumo>>('/api/pdis', {
      params: {
        page: paginacao.page ?? 0,
        size: paginacao.size ?? 20,
        sort: 'criadoEm,desc',
      },
      signal: config?.signal,
    })
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar os PDIs.')
  }
}

export async function buscarPdi(
  id: string,
  config?: { signal?: AbortSignal },
): Promise<PdiDetalhe> {
  try {
    const { data } = await api.get<PdiDetalhe>(
      `/api/pdis/${encodeURIComponent(id)}`,
      { signal: config?.signal },
    )
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar o PDI.')
  }
}

export async function criarPdi(request: CriarPdiRequest): Promise<PdiDetalhe> {
  try {
    const { data } = await api.post<PdiDetalhe>('/api/pdis', request)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível criar o PDI.')
  }
}

/** Usuários ativos do tenant que podem receber um PDI (campo "Colaborador"). */
export async function listarColaboradores(config?: {
  signal?: AbortSignal
}): Promise<ColaboradorOpcao[]> {
  try {
    const { data } = await api.get<Pagina<ColaboradorOpcao>>(
      '/api/pdis/colaboradores',
      {
        params: { page: 0, size: 500, sort: 'nomeCompleto' },
        signal: config?.signal,
      },
    )
    return data.content
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar os colaboradores.')
  }
}

/** Inclui uma competência no PDI. */
export async function adicionarCompetencia(
  pdiId: string,
  request: PdiItemRequest,
): Promise<PdiItem> {
  try {
    const { data } = await api.post<PdiItem>(
      `/api/pdis/${encodeURIComponent(pdiId)}/itens`,
      request,
    )
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível adicionar a competência.')
  }
}

/**
 * Liga uma trilha a uma competência do PDI. A API atribui a trilha ao
 * colaborador com o prazo informado, sem duplicar.
 */
export async function ligarTrilha(
  pdiId: string,
  itemId: string,
  request: LigarTrilhaRequest,
): Promise<PdiAcao> {
  try {
    const { data } = await api.post<PdiAcao>(
      `/api/pdis/${encodeURIComponent(pdiId)}/itens/${encodeURIComponent(itemId)}/acoes`,
      request,
    )
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível ligar a trilha ao PDI.')
  }
}
