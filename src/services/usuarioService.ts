import axios from 'axios'
import { api } from './api.ts'
import type { ApiErrorResponse, ApiFieldError } from '../types/api.ts'
import type {
  AtualizarUsuarioRequest,
  CriarUsuarioRequest,
  Pagina,
  SituacaoUsuario,
  Usuario,
  UsuarioFiltro,
  UsuarioPaginacao,
} from '../types/usuario.ts'

/**
 * Erro da gestão de usuários já normalizado: a UI lê `message` e `fieldErrors`
 * sem precisar conhecer o Axios. A mensagem da API nunca é descartada — o
 * texto padrão só entra quando a resposta não trouxe nenhuma.
 */
export class UsuarioServiceError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldError[]

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'UsuarioServiceError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function toServiceError(
  error: unknown,
  fallbackMessage: string,
): UsuarioServiceError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status
    return new UsuarioServiceError(
      error.response?.data?.message ??
        mensagemPorStatus(status, fallbackMessage),
      status,
      error.response?.data?.fieldErrors ?? [],
    )
  }
  return new UsuarioServiceError(fallbackMessage)
}

/**
 * O 403 é o único status com mensagem própria: o backend costuma respondê-lo
 * sem corpo, e "sem permissão" é mais útil do que o texto genérico da operação.
 */
function mensagemPorStatus(
  status: number | undefined,
  fallbackMessage: string,
): string {
  if (status === 403) {
    return 'Você não tem permissão para esta operação.'
  }
  return fallbackMessage
}

/**
 * Nome do parâmetro na API quando difere do nome do campo na tela: o record
 * `UsuarioFiltro` do backend chama o perfil de `papel`.
 */
const PARAMETRO_DA_API: Partial<Record<keyof UsuarioFiltro, string>> = {
  perfil: 'papel',
}

/** Campo vazio não vira parâmetro: `?nome=` faria a API filtrar por string vazia. */
function apenasPreenchidos(filtro: UsuarioFiltro): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filtro)
      .filter(([, valor]) => valor !== undefined && valor !== '')
      .map(([campo, valor]) => [
        PARAMETRO_DA_API[campo as keyof UsuarioFiltro] ?? campo,
        valor,
      ]),
  ) as Record<string, string>
}

export async function listarUsuarios(
  filtro: UsuarioFiltro = {},
  paginacao: UsuarioPaginacao = {},
  config?: { signal?: AbortSignal },
): Promise<Pagina<Usuario>> {
  try {
    const { data } = await api.get<Pagina<Usuario>>('/api/usuarios', {
      params: {
        ...apenasPreenchidos(filtro),
        page: paginacao.page ?? 0,
        size: paginacao.size ?? 20,
        sort: paginacao.sort ?? 'nomeCompleto',
      },
      signal: config?.signal,
    })
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar os usuários.')
  }
}

export async function buscarUsuario(id: string): Promise<Usuario> {
  try {
    const { data } = await api.get<Usuario>(`/api/usuarios/${id}`)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar o usuário.')
  }
}

export async function criarUsuario(
  request: CriarUsuarioRequest,
): Promise<Usuario> {
  try {
    const { data } = await api.post<Usuario>('/api/usuarios', request)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível cadastrar o usuário.')
  }
}

export async function atualizarUsuario(
  id: string,
  request: AtualizarUsuarioRequest,
): Promise<Usuario> {
  try {
    const { data } = await api.put<Usuario>(`/api/usuarios/${id}`, request)
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível salvar as alterações.')
  }
}

export async function atualizarSituacaoUsuario(
  id: string,
  situacao: SituacaoUsuario,
): Promise<Usuario> {
  try {
    const { data } = await api.patch<Usuario>(`/api/usuarios/${id}/situacao`, {
      situacao,
    })
    return data
  } catch (error) {
    throw toServiceError(
      error,
      'Não foi possível alterar a situação do usuário.',
    )
  }
}
