import { api } from './api.ts'
import {
  HTTP_STATUS,
  MENSAGENS_DE_ERRO,
  normalizarErro,
} from '../utils/errorHandler.ts'
import type { InteracaoHistorico } from '../types/historico.ts'
import type { Pagina } from '../types/usuario.ts'

/** Interações por página no Histórico. */
export const TAMANHO_PAGINA_HISTORICO = 20

/** Erro do histórico já normalizado: a tela lê `message` sem conhecer o Axios. */
export class HistoricoServiceError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'HistoricoServiceError'
    this.status = status
  }
}

/**
 * Histórico de interações (`GET /api/historico`), do mais recente para o mais
 * antigo. `ADMIN` recebe o do tenant inteiro; os outros perfis, só o próprio.
 */
export async function listarHistorico(
  page = 0,
  config?: { signal?: AbortSignal },
): Promise<Pagina<InteracaoHistorico>> {
  try {
    const { data } = await api.get<Pagina<InteracaoHistorico>>(
      '/api/historico',
      {
        params: { page, size: TAMANHO_PAGINA_HISTORICO, sort: 'criadoEm,desc' },
        signal: config?.signal,
      },
    )
    return data
  } catch (error) {
    const { message, status } = normalizarErro(
      error,
      'Não foi possível carregar o histórico.',
      {
        mensagens: {
          [HTTP_STATUS.FORBIDDEN]: MENSAGENS_DE_ERRO.SEM_PERMISSAO,
          [HTTP_STATUS.INTERNAL_SERVER_ERROR]:
            MENSAGENS_DE_ERRO.ERRO_DO_SERVIDOR,
        },
      },
    )
    throw new HistoricoServiceError(message, status)
  }
}
