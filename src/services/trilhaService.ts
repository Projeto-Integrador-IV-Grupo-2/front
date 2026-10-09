import type { AxiosRequestConfig } from 'axios'
import { api } from './api.ts'
import {
  HTTP_STATUS,
  MENSAGENS_DE_ERRO,
  normalizarErro,
  type MensagensPorStatus,
} from '../utils/errorHandler.ts'
import { adaptadorTrilhasMock } from './mocks/trilhasMock.ts'
import type { ApiFieldError } from '../types/api.ts'
import type {
  AtualizarProgressoRequest,
  CriarTrilhaRequest,
  ProgressoTrilha,
  TrilhaDetalhe,
  TrilhaFiltro,
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

/**
 * Textos das trilhas que vencem a mensagem da API.
 *
 * 404: o backend responde "Trilha não encontrada: <uuid>", e o id não ajuda
 * quem está na tela. Trilha de outro tenant também volta 404 (nunca 403),
 * então a mensagem cobre os dois casos.
 *
 * 403 e 5xx: o 403 costuma vir sem corpo, e a mensagem de um 500 é técnica
 * demais para mostrar a quem está usando a tela.
 */
const MENSAGENS_DAS_TRILHAS: MensagensPorStatus = {
  [HTTP_STATUS.NOT_FOUND]:
    'Trilha não encontrada. Ela pode ter sido removida ou não estar disponível para você.',
  [HTTP_STATUS.FORBIDDEN]: MENSAGENS_DE_ERRO.SEM_PERMISSAO,
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: MENSAGENS_DE_ERRO.ERRO_DO_SERVIDOR,
}

function toServiceError(
  error: unknown,
  fallbackMessage: string,
  mensagens: MensagensPorStatus = {},
): TrilhaServiceError {
  const { message, status, fieldErrors } = normalizarErro(
    error,
    fallbackMessage,
    { mensagens: { ...MENSAGENS_DAS_TRILHAS, ...mensagens } },
  )
  return new TrilhaServiceError(message, status, fieldErrors)
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

/**
 * Filtro vazio não vira parâmetro: `?nome=` faria a API filtrar por string
 * vazia, e `minhas=false` é só o padrão dito em voz alta.
 */
function apenasPreenchidos(
  filtro: TrilhaFiltro,
): Record<string, string | boolean> {
  return Object.fromEntries(
    Object.entries(filtro).filter(
      ([, valor]) => valor !== undefined && valor !== '' && valor !== false,
    ),
  ) as Record<string, string | boolean>
}

function paramsDaListagem(filtro: TrilhaFiltro, paginacao: TrilhaPaginacao) {
  return {
    ...apenasPreenchidos(filtro),
    page: paginacao.page ?? 0,
    size: paginacao.size ?? 20,
    sort: paginacao.sort ?? 'nome',
  }
}

export async function listarTrilhas(
  filtro: TrilhaFiltro = {},
  paginacao: TrilhaPaginacao = {},
  config?: { signal?: AbortSignal },
): Promise<Pagina<TrilhaResumo>> {
  try {
    const { data } = await api.get<Pagina<TrilhaResumo>>('/api/trilhas', {
      ...configBase(),
      params: paramsDaListagem(filtro, paginacao),
      signal: config?.signal,
    })
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar as trilhas.')
  }
}

/**
 * Trilhas ativas de uma área (`GET /api/areas/{id}/trilhas`), com os mesmos
 * filtros da listagem. Aqui o 404 é da área, não de uma trilha.
 */
export async function listarTrilhasDaArea(
  areaId: string,
  filtro: TrilhaFiltro = {},
  paginacao: TrilhaPaginacao = {},
  config?: { signal?: AbortSignal },
): Promise<Pagina<TrilhaResumo>> {
  try {
    const { data } = await api.get<Pagina<TrilhaResumo>>(
      `/api/areas/${encodeURIComponent(areaId)}/trilhas`,
      {
        ...configBase(),
        params: paramsDaListagem(filtro, paginacao),
        signal: config?.signal,
      },
    )
    return data
  } catch (error) {
    // Aqui o 404 é da área, não de uma trilha.
    throw toServiceError(
      error,
      'Não foi possível carregar as trilhas da área.',
      {
        [HTTP_STATUS.NOT_FOUND]:
          'Área não encontrada. Ela pode ter sido removida.',
      },
    )
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

/** Trilha completa com o progresso do usuário autenticado. */
export async function buscarTrilha(
  id: string,
  config?: { signal?: AbortSignal },
): Promise<TrilhaDetalhe> {
  try {
    const { data } = await api.get<TrilhaDetalhe>(
      `/api/trilhas/${encodeURIComponent(id)}`,
      { ...configBase(), signal: config?.signal },
    )
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar a trilha.')
  }
}

/**
 * Inicia a trilha para o usuário autenticado (`TrilhaAtribuicaoService.iniciar`
 * no backend). Idempotente: se já existe progresso, a API só o devolve.
 */
export async function iniciarTrilha(id: string): Promise<ProgressoTrilha> {
  try {
    const { data } = await api.post<ProgressoTrilha>(
      `/api/trilhas/${encodeURIComponent(id)}/progresso`,
      undefined,
      configBase(),
    )
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível iniciar a trilha.')
  }
}

/** Troca o status do progresso já iniciado (`TrilhaAtribuicaoService.atualizar`). */
export async function atualizarProgresso(
  id: string,
  request: AtualizarProgressoRequest,
): Promise<ProgressoTrilha> {
  try {
    const { data } = await api.patch<ProgressoTrilha>(
      `/api/trilhas/${encodeURIComponent(id)}/progresso`,
      request,
      configBase(),
    )
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível atualizar o progresso.')
  }
}
