import { api } from './api.ts'
import {
  HTTP_STATUS,
  MENSAGENS_DE_ERRO,
  normalizarErro,
} from '../utils/errorHandler.ts'
import type { ApiFieldError } from '../types/api.ts'
import type {
  DashboardColaboradorResponse,
  DashboardGestaoResponse,
} from '../types/dashboard.ts'

/** Erro de dashboard sem detalhes internos do Axios. */
export class DashboardServiceError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldError[]

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'DashboardServiceError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function normalizarErroDashboard(
  error: unknown,
  mensagemPadrao: string,
): DashboardServiceError {
  const resultado = normalizarErro(error, mensagemPadrao, {
    mensagens: {
      [HTTP_STATUS.FORBIDDEN]:
        'Você não tem permissão para visualizar este dashboard.',
      [HTTP_STATUS.INTERNAL_SERVER_ERROR]: MENSAGENS_DE_ERRO.ERRO_DO_SERVIDOR,
    },
  })
  return new DashboardServiceError(
    resultado.message,
    resultado.status,
    resultado.fieldErrors,
  )
}

/** Carrega os indicadores pessoais; o backend define o usuário pelo token. */
export async function carregarDashboardColaborador(config?: {
  signal?: AbortSignal
}): Promise<DashboardColaboradorResponse> {
  try {
    const { data } = await api.get<DashboardColaboradorResponse>(
      '/api/dashboard/colaborador',
      { signal: config?.signal },
    )
    return data
  } catch (error) {
    throw normalizarErroDashboard(
      error,
      'Não foi possível carregar o dashboard do colaborador.',
    )
  }
}

/** Carrega indicadores de gestão sem aceitar tenant ou usuário do cliente. */
export async function carregarDashboardGestao(config?: {
  signal?: AbortSignal
}): Promise<DashboardGestaoResponse> {
  try {
    const { data } = await api.get<DashboardGestaoResponse>(
      '/api/dashboard/gestao',
      { signal: config?.signal },
    )
    return data
  } catch (error) {
    throw normalizarErroDashboard(
      error,
      'Não foi possível carregar o dashboard da gestão.',
    )
  }
}
