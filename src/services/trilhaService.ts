import axios, { type AxiosRequestConfig } from 'axios'
import { api } from './api.ts'
import { adaptadorTrilhasMock } from './mocks/trilhasMock.ts'
import type { ApiErrorResponse, ApiFieldError } from '../types/api.ts'
import type {
  CriarTrilhaRequest,
  TrilhaPaginacao,
  TrilhaResumo,
} from '../types/trilha.ts'
import type { Pagina, RecursoResumo } from '../types/usuario.ts'

/**
 * Erro das trilhas já normalizado: a UI lê `message`, `status` e
 * `fieldErrors` sem conhecer o Axios. A mensagem da API tem prioridade; o
 * texto padrão só entra quando a resposta não trouxe nenhuma.
 */
export class TrilhaServiceError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldError[]

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'TrilhaServiceError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function toServiceError(
  error: unknown,
  fallbackMessage: string,
): TrilhaServiceError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status
    return new TrilhaServiceError(
      mensagemPorStatus(status) ??
        error.response?.data?.message ??
        fallbackMessage,
      status,
      error.response?.data?.fieldErrors ?? [],
    )
  }
  return new TrilhaServiceError(fallbackMessage)
}

/**
 * 403 e 5xx ganham texto próprio: o 403 costuma vir sem corpo, e a mensagem
 * de um 500 é técnica demais para mostrar a quem está usando a tela.
 */
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
 * Enquanto o backend de trilhas não está completo, `VITE_TRILHAS_MOCK=true`
 * troca só o *adapter* do Axios: caminhos, corpos e interceptors continuam os
 * mesmos da API real (ver `mocks/trilhasMock.ts`). Lido a cada chamada para os
 * testes poderem ligar e desligar com `vi.stubEnv`.
 */
function configBase(): AxiosRequestConfig {
  return import.meta.env.VITE_TRILHAS_MOCK === 'true'
    ? { adapter: adaptadorTrilhasMock }
    : {}
}

export async function listarTrilhas(
  paginacao: TrilhaPaginacao = {},
  config?: { signal?: AbortSignal },
): Promise<Pagina<TrilhaResumo>> {
  try {
    const { data } = await api.get<Pagina<TrilhaResumo>>('/api/trilhas', {
      ...configBase(),
      params: {
        page: paginacao.page ?? 0,
        size: paginacao.size ?? 20,
        sort: paginacao.sort ?? 'nome',
      },
      signal: config?.signal,
    })
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar as trilhas.')
  }
}

export async function criarTrilha(
  request: CriarTrilhaRequest,
): Promise<TrilhaResumo> {
  try {
    const { data } = await api.post<TrilhaResumo>(
      '/api/trilhas',
      request,
      configBase(),
    )
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível criar a trilha.')
  }
}

/**
 * Áreas ativas para o campo "Área" do cadastro. Falha aqui não impede o
 * cadastro — a trilha pode ser multi-área —, então quem chama decide se mostra
 * o erro ou só segue sem as opções.
 */
export async function listarAreasParaTrilha(): Promise<RecursoResumo[]> {
  try {
    const { data } = await api.get<Pagina<RecursoResumo>>('/api/areas', {
      ...configBase(),
      params: { page: 0, size: 100, sort: 'nome' },
    })
    return data.content.map(({ id, nome }) => ({ id, nome }))
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar as áreas.')
  }
}
