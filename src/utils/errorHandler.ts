import axios from 'axios'
import type { ApiErrorResponse, ApiFieldError } from '../types/api.ts'

/**
 * Status HTTP que o frontend trata de forma própria, em um lugar só: services
 * e telas comparam com estas constantes em vez de repetir o número.
 */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]

/** Textos de erro compartilhados pela aplicação. */
export const MENSAGENS_DE_ERRO = {
  SEM_PERMISSAO: 'Você não tem permissão para esta operação.',
  ERRO_DO_SERVIDOR:
    'O servidor não conseguiu concluir a operação. Tente novamente em instantes.',
} as const

/** Texto de um service para um status; em `INTERNAL_SERVER_ERROR`, vale para todo 5xx. */
export type MensagensPorStatus = Partial<Record<HttpStatus, string>>

/** Qualquer 5xx: o servidor falhou, não a requisição. */
export function ehErroDoServidor(status: number | undefined): boolean {
  return status !== undefined && status >= HTTP_STATUS.INTERNAL_SERVER_ERROR
}

/**
 * Usadas quando a API não mandou mensagem: o 403 costuma vir sem corpo, e
 * "sem permissão" é mais útil do que o texto genérico da operação.
 */
const MENSAGENS_SEM_CORPO: MensagensPorStatus = {
  [HTTP_STATUS.FORBIDDEN]: MENSAGENS_DE_ERRO.SEM_PERMISSAO,
}

/** Erro já sem Axios: é o que os services entregam à UI. */
export interface ErroNormalizado {
  message: string
  status?: number
  fieldErrors: ApiFieldError[]
}

export interface OpcoesDeErro {
  /**
   * Textos do service que vencem a mensagem da API — para quando ela não
   * serve para a tela (ex.: traz um id, ou é técnica demais num 500).
   */
  mensagens?: MensagensPorStatus
  /** Corpo já lido, quando a resposta não chegou como JSON (ex.: Blob). */
  corpo?: ApiErrorResponse
}

function mensagemDoService(
  status: number | undefined,
  mensagens: MensagensPorStatus,
): string | undefined {
  if (status === undefined) {
    return undefined
  }
  return (
    mensagens[status as HttpStatus] ??
    (ehErroDoServidor(status)
      ? mensagens[HTTP_STATUS.INTERNAL_SERVER_ERROR]
      : undefined)
  )
}

/**
 * Traduz qualquer falha de chamada à API em `message`, `status` e
 * `fieldErrors`. A ordem da mensagem é: a do service para o status, a que a
 * API mandou, a padrão do status e, por fim, o texto genérico da operação.
 */
export function normalizarErro(
  error: unknown,
  fallbackMessage: string,
  { mensagens = {}, corpo }: OpcoesDeErro = {},
): ErroNormalizado {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return { message: fallbackMessage, fieldErrors: [] }
  }
  const status = error.response?.status
  const dados = corpo ?? error.response?.data
  return {
    message:
      mensagemDoService(status, mensagens) ??
      dados?.message ??
      MENSAGENS_SEM_CORPO[status as HttpStatus] ??
      fallbackMessage,
    status,
    fieldErrors: dados?.fieldErrors ?? [],
  }
}
