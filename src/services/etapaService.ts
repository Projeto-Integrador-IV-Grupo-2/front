import { api } from './api.ts'
import { emitirEventoTrilha } from './eventosTrilha.ts'
import { normalizarErro } from '../utils/errorHandler.ts'
import type { ApiFieldError } from '../types/api.ts'
import type { ConclusaoEtapa, Etapa, EtapaRequest } from '../types/etapa.ts'

/** Erro das etapas e do progresso por etapa, já normalizado. */
export class EtapaServiceError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldError[]

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'EtapaServiceError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function toServiceError(
  error: unknown,
  fallbackMessage: string,
): EtapaServiceError {
  const { message, status, fieldErrors } = normalizarErro(
    error,
    fallbackMessage,
  )
  return new EtapaServiceError(message, status, fieldErrors)
}

function base(trilhaId: string): string {
  return `/api/trilhas/${encodeURIComponent(trilhaId)}/etapas`
}

export async function listarEtapas(
  trilhaId: string,
  config?: { signal?: AbortSignal },
): Promise<Etapa[]> {
  try {
    const { data } = await api.get<Etapa[]>(base(trilhaId), {
      signal: config?.signal,
    })
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar as etapas.')
  }
}

export async function criarEtapa(
  trilhaId: string,
  request: EtapaRequest,
): Promise<Etapa> {
  try {
    const { data } = await api.post<Etapa>(base(trilhaId), request)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível adicionar a etapa.')
  }
}

export async function atualizarEtapa(
  trilhaId: string,
  etapaId: string,
  request: EtapaRequest,
): Promise<Etapa> {
  try {
    const { data } = await api.put<Etapa>(
      `${base(trilhaId)}/${encodeURIComponent(etapaId)}`,
      request,
    )
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível salvar a etapa.')
  }
}

export async function removerEtapa(
  trilhaId: string,
  etapaId: string,
): Promise<void> {
  try {
    await api.delete(`${base(trilhaId)}/${encodeURIComponent(etapaId)}`)
  } catch (error) {
    throw toServiceError(error, 'Não foi possível remover a etapa.')
  }
}

/** Manda todas as etapas na nova sequência; a primeira vira ordem 1. */
export async function reordenarEtapas(
  trilhaId: string,
  etapaIds: string[],
): Promise<Etapa[]> {
  try {
    const { data } = await api.patch<Etapa[]>(`${base(trilhaId)}/ordem`, {
      etapaIds,
    })
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível reordenar as etapas.')
  }
}

/** Conclui a etapa para o próprio usuário e devolve o progresso recalculado. */
export async function concluirEtapa(
  trilhaId: string,
  etapaId: string,
): Promise<ConclusaoEtapa> {
  try {
    const { data } = await api.post<ConclusaoEtapa>(
      `${base(trilhaId)}/${encodeURIComponent(etapaId)}/concluir`,
    )
    // Concluir uma etapa inicia a trilha no backend: avisa quem mostra a
    // trilha como "não iniciada" (as sugestões).
    emitirEventoTrilha({ tipo: 'trilha-iniciada', trilhaId })
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível concluir a etapa.')
  }
}
