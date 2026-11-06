import { api } from './api.ts'
import {
  HTTP_STATUS,
  MENSAGENS_DE_ERRO,
  normalizarErro,
} from '../utils/errorHandler.ts'
import type { Notificacao, TotalNaoLidas } from '../types/notificacao.ts'
import type { Pagina } from '../types/usuario.ts'

/** Notificações por página na tela `/notificacoes`. */
export const TAMANHO_PAGINA_NOTIFICACOES = 20

/** Quantas aparecem no painel do sino (as mais recentes). */
export const TAMANHO_PAINEL_NOTIFICACOES = 8

/** Erro das notificações já normalizado: a tela lê `message` sem conhecer o Axios. */
export class NotificacaoServiceError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'NotificacaoServiceError'
    this.status = status
  }
}

function falha(error: unknown, padrao: string): NotificacaoServiceError {
  const { message, status } = normalizarErro(error, padrao, {
    mensagens: {
      // Notificação de outra pessoa (ou que sumiu na limpeza) responde 404.
      [HTTP_STATUS.NOT_FOUND]: 'Esta notificação não existe mais.',
      [HTTP_STATUS.INTERNAL_SERVER_ERROR]: MENSAGENS_DE_ERRO.ERRO_DO_SERVIDOR,
    },
  })
  return new NotificacaoServiceError(message, status)
}

interface OpcoesDeLista {
  page?: number
  size?: number
  /** Só as não lidas. */
  naoLidas?: boolean
  signal?: AbortSignal
}

/**
 * Notificações do usuário logado (`GET /api/notificacoes`), das mais recentes
 * para as mais antigas. A ordem é fixa na API.
 */
export async function listarNotificacoes({
  page = 0,
  size = TAMANHO_PAGINA_NOTIFICACOES,
  naoLidas = false,
  signal,
}: OpcoesDeLista = {}): Promise<Pagina<Notificacao>> {
  try {
    const { data } = await api.get<Pagina<Notificacao>>('/api/notificacoes', {
      params: { page, size, ...(naoLidas ? { naoLidas: true } : {}) },
      signal,
    })
    return data
  } catch (error) {
    throw falha(error, 'Não foi possível carregar as notificações.')
  }
}

/** O número do sino (`GET /api/notificacoes/nao-lidas/total`). */
export async function contarNaoLidas(config?: {
  signal?: AbortSignal
}): Promise<number> {
  try {
    const { data } = await api.get<TotalNaoLidas>(
      '/api/notificacoes/nao-lidas/total',
      { signal: config?.signal },
    )
    return data.total
  } catch (error) {
    throw falha(error, 'Não foi possível atualizar as notificações.')
  }
}

/** Marca uma notificação como lida. Marcar de novo não muda nada na API. */
export async function marcarComoLida(id: string): Promise<Notificacao> {
  try {
    const { data } = await api.patch<Notificacao>(
      `/api/notificacoes/${encodeURIComponent(id)}/lida`,
    )
    return data
  } catch (error) {
    throw falha(error, 'Não foi possível marcar a notificação como lida.')
  }
}

/** Marca todas as não lidas do usuário como lidas. */
export async function marcarTodasComoLidas(): Promise<void> {
  try {
    await api.patch('/api/notificacoes/lidas')
  } catch (error) {
    throw falha(error, 'Não foi possível marcar as notificações como lidas.')
  }
}
