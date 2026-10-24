import type { AxiosRequestConfig } from 'axios'
import { api } from './api.ts'
import { adaptadorAssistenteMock } from './mocks/assistenteMock.ts'
import {
  HTTP_STATUS,
  MENSAGENS_DE_ERRO,
  normalizarErro,
} from '../utils/errorHandler.ts'
import type {
  MensagemAssistente,
  PaginacaoSessoes,
  RespostaPergunta,
  SessaoAssistente,
} from '../types/assistente.ts'
import type { Pagina } from '../types/usuario.ts'

const BASE = '/api/assistente/sessoes'

/** Conversas por página no histórico. */
export const TAMANHO_PAGINA_SESSOES = 20

/** Limite do título de uma conversa. */
export const LIMITE_TITULO = 80

/**
 * Erro do assistente já normalizado: a UI lê `message` e `status` sem
 * conhecer o Axios.
 */
export class AssistenteServiceError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AssistenteServiceError'
    this.status = status
  }
}

/**
 * Conversa de outro usuário também volta 404 (nunca 403): para quem está na
 * tela, ela simplesmente não existe.
 */
export const MENSAGEM_CONVERSA_NAO_ENCONTRADA = 'Conversa não encontrada.'

function toServiceError(
  error: unknown,
  fallbackMessage: string,
): AssistenteServiceError {
  const { message, status } = normalizarErro(error, fallbackMessage, {
    mensagens: {
      [HTTP_STATUS.NOT_FOUND]: MENSAGEM_CONVERSA_NAO_ENCONTRADA,
      [HTTP_STATUS.FORBIDDEN]: MENSAGENS_DE_ERRO.SEM_PERMISSAO,
      [HTTP_STATUS.INTERNAL_SERVER_ERROR]: MENSAGENS_DE_ERRO.ERRO_DO_SERVIDOR,
    },
  })
  return new AssistenteServiceError(message, status)
}

/**
 * O backend do assistente ainda não existe, então o mock fica ligado por
 * padrão; `VITE_ASSISTENTE_MOCK=false` passa a falar com a API de verdade.
 * Só o *adapter* do Axios muda: caminhos, corpos e interceptors de sessão são
 * os mesmos. Lido a cada chamada para os testes desligarem com `vi.stubEnv`.
 */
function configMock(): AxiosRequestConfig {
  return import.meta.env.VITE_ASSISTENTE_MOCK === 'false'
    ? {}
    : { adapter: adaptadorAssistenteMock }
}

/** Título de uma conversa nova: o começo da primeira pergunta. */
export function tituloDaPergunta(pergunta: string): string {
  const limpa = pergunta.trim().replace(/\s+/g, ' ')
  return limpa.length > LIMITE_TITULO
    ? `${limpa.slice(0, LIMITE_TITULO - 1).trimEnd()}…`
    : limpa
}

/** Conversas do usuário logado, da mais recente para a mais antiga. */
export async function listarSessoes(
  { page = 0, size = TAMANHO_PAGINA_SESSOES }: PaginacaoSessoes = {},
  config: AxiosRequestConfig = {},
): Promise<Pagina<SessaoAssistente>> {
  try {
    const { data } = await api.get<Pagina<SessaoAssistente>>(BASE, {
      ...configMock(),
      ...config,
      params: { page, size, sort: 'atualizadoEm,desc' },
    })
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar as conversas.')
  }
}

export async function criarSessao(titulo: string): Promise<SessaoAssistente> {
  try {
    const { data } = await api.post<SessaoAssistente>(
      BASE,
      { titulo },
      configMock(),
    )
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível iniciar a conversa.')
  }
}

/** Mensagens de uma conversa, da mais antiga para a mais nova. */
export async function listarMensagens(
  sessaoId: string,
  config: AxiosRequestConfig = {},
): Promise<MensagemAssistente[]> {
  try {
    const { data } = await api.get<MensagemAssistente[]>(
      `${BASE}/${encodeURIComponent(sessaoId)}/mensagens`,
      { ...configMock(), ...config },
    )
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar a conversa.')
  }
}

export async function enviarMensagem(
  sessaoId: string,
  conteudo: string,
): Promise<RespostaPergunta> {
  try {
    const { data } = await api.post<RespostaPergunta>(
      `${BASE}/${encodeURIComponent(sessaoId)}/mensagens`,
      { conteudo },
      configMock(),
    )
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível enviar a pergunta.')
  }
}

export async function renomearSessao(
  sessaoId: string,
  titulo: string,
): Promise<SessaoAssistente> {
  try {
    const { data } = await api.patch<SessaoAssistente>(
      `${BASE}/${encodeURIComponent(sessaoId)}`,
      { titulo },
      configMock(),
    )
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível renomear a conversa.')
  }
}

export async function apagarSessao(sessaoId: string): Promise<void> {
  try {
    await api.delete(`${BASE}/${encodeURIComponent(sessaoId)}`, configMock())
  } catch (error) {
    throw toServiceError(error, 'Não foi possível apagar a conversa.')
  }
}
