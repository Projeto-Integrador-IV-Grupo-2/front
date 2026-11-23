import { api } from './api.ts'
import { normalizarErro } from '../utils/errorHandler.ts'
import type { ApiFieldError } from '../types/api.ts'
import type { CriarEmpresaRequest, Empresa } from '../types/empresa.ts'

const BASE = '/api/admin/empresas'

/** Erro do cadastro de empresas já normalizado, com os erros por campo. */
export class EmpresaServiceError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldError[]

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'EmpresaServiceError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function toServiceError(
  error: unknown,
  fallbackMessage: string,
): EmpresaServiceError {
  const { message, status, fieldErrors } = normalizarErro(
    error,
    fallbackMessage,
  )
  return new EmpresaServiceError(message, status, fieldErrors)
}

export async function listarEmpresas(config?: {
  signal?: AbortSignal
}): Promise<Empresa[]> {
  try {
    const { data } = await api.get<Empresa[]>(BASE, { signal: config?.signal })
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar as empresas.')
  }
}

export async function criarEmpresa(
  request: CriarEmpresaRequest,
): Promise<Empresa> {
  try {
    const { data } = await api.post<Empresa>(BASE, request)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível cadastrar a empresa.')
  }
}

/** Sugestão de subdomínio a partir do nome: minúsculas, sem acento, com hífen. */
export function sugerirSubdominio(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/\s+/)[0]
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
}
