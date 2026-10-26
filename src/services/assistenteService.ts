import type { ApiFieldError } from '../types/api.ts'
import type {
  AssistentePerguntaRequest,
  AssistenteRespostaResponse,
  AssistenteSessaoResponse,
} from '../types/assistente.ts'
import { HTTP_STATUS, normalizarErro } from '../utils/errorHandler.ts'
import { api } from './api.ts'

const MENSAGENS_ASSISTENTE = {
  [HTTP_STATUS.SERVICE_UNAVAILABLE]:
    'O assistente de IA está indisponível no momento. Tente novamente em instantes.',
  [HTTP_STATUS.TOO_MANY_REQUESTS]:
    'Você atingiu o limite de perguntas. Aguarde um pouco antes de tentar novamente.',
} as const

/** Erro HTTP já normalizado para ser consumido pela interface. */
export class AssistenteServiceError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldError[]

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'AssistenteServiceError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function normalizarErroAssistente(
  error: unknown,
  fallbackMessage: string,
): AssistenteServiceError {
  const { message, status, fieldErrors } = normalizarErro(
    error,
    fallbackMessage,
    { mensagens: MENSAGENS_ASSISTENTE },
  )
  return new AssistenteServiceError(message, status, fieldErrors)
}

/**
 * Cria uma sessão no primeiro envio; a sessão é mantida pela tela durante a
 * conversa.
 */
export async function criarSessaoAssistente(config?: {
  signal?: AbortSignal
}): Promise<AssistenteSessaoResponse> {
  try {
    const { data } = await api.post<AssistenteSessaoResponse>(
      '/api/assistente/sessoes',
      undefined,
      { signal: config?.signal },
    )
    return data
  } catch (error) {
    throw normalizarErroAssistente(
      error,
      'Não foi possível iniciar uma conversa com o assistente.',
    )
  }
}

/**
 * Envia uma pergunta à sessão existente e retorna resposta e respectivas
 * fontes.
 */
export async function consultarAssistente(
  sessaoId: string,
  request: AssistentePerguntaRequest,
  config?: { signal?: AbortSignal },
): Promise<AssistenteRespostaResponse> {
  try {
    const { data } = await api.post<AssistenteRespostaResponse>(
      `/api/assistente/sessoes/${encodeURIComponent(sessaoId)}/mensagens`,
      request,
      { signal: config?.signal },
    )
    return {
      ...data,
      pergunta: { ...data.pergunta, fontes: data.pergunta.fontes ?? [] },
      resposta: { ...data.resposta, fontes: data.resposta.fontes ?? [] },
    }
  } catch (error) {
    throw normalizarErroAssistente(
      error,
      'Não foi possível obter uma resposta do assistente. Tente novamente.',
    )
  }
}
