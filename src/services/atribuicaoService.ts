import axios from 'axios'
import { api } from './api.ts'
import type { ApiErrorResponse, ApiFieldError } from '../types/api.ts'
import type {
  ArquivoExportado,
  AtribuicaoAcompanhamento,
  AtribuicaoFiltro,
  AtribuicaoPaginacao,
  ColaboradorAcompanhamento,
} from '../types/atribuicao.ts'
import type { Pagina } from '../types/usuario.ts'

/**
 * Erro do acompanhamento já normalizado: a UI lê `message` e `status` sem
 * conhecer o Axios. Mesmo formato dos outros services.
 */
export class AtribuicaoServiceError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldError[]

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'AtribuicaoServiceError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

/**
 * 403 e 5xx ganham texto próprio: o 403 costuma vir sem corpo, e a mensagem
 * de um 500 é técnica demais para quem está na tela.
 */
function mensagemPorStatus(status: number | undefined): string | undefined {
  if (status === 403) {
    return 'Você não tem permissão para acompanhar as trilhas da equipe.'
  }
  if (status !== undefined && status >= 500) {
    return 'O servidor não conseguiu concluir a operação. Tente novamente em instantes.'
  }
  return undefined
}

function toServiceError(
  error: unknown,
  fallbackMessage: string,
  corpo?: ApiErrorResponse,
): AtribuicaoServiceError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status
    const dados = corpo ?? error.response?.data
    return new AtribuicaoServiceError(
      mensagemPorStatus(status) ?? dados?.message ?? fallbackMessage,
      status,
      dados?.fieldErrors ?? [],
    )
  }
  return new AtribuicaoServiceError(fallbackMessage)
}

/** Campo vazio não vira parâmetro: `?status=` faria a API recusar o enum. */
function apenasPreenchidos(filtro: AtribuicaoFiltro): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filtro).filter(
      ([, valor]) => valor !== undefined && valor !== '',
    ),
  ) as Record<string, string>
}

export async function listarAtribuicoes(
  filtro: AtribuicaoFiltro = {},
  paginacao: AtribuicaoPaginacao = {},
  config?: { signal?: AbortSignal },
): Promise<Pagina<AtribuicaoAcompanhamento>> {
  try {
    const { data } = await api.get<Pagina<AtribuicaoAcompanhamento>>(
      '/api/atribuicoes',
      {
        params: {
          ...apenasPreenchidos(filtro),
          page: paginacao.page ?? 0,
          size: paginacao.size ?? 20,
          sort: paginacao.sort ?? 'usuario.nomeCompleto',
        },
        signal: config?.signal,
      },
    )
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar o acompanhamento.')
  }
}

/** Todas as trilhas de um colaborador e os totais por status. */
export async function buscarAcompanhamentoDoColaborador(
  usuarioId: string,
  config?: { signal?: AbortSignal },
): Promise<ColaboradorAcompanhamento> {
  try {
    const { data } = await api.get<ColaboradorAcompanhamento>(
      `/api/atribuicoes/colaboradores/${encodeURIComponent(usuarioId)}`,
      { signal: config?.signal },
    )
    return data
  } catch (error) {
    const normalizado = toServiceError(
      error,
      'Não foi possível carregar as trilhas do colaborador.',
    )
    if (normalizado.status === 404) {
      throw new AtribuicaoServiceError('Colaborador não encontrado.', 404)
    }
    throw normalizado
  }
}

/** O CORS da API não expõe `Content-Disposition`; o nome sai daqui quando ele não vem. */
function nomePadraoDoCsv(): string {
  const hoje = new Date().toISOString().slice(0, 10)
  return `acompanhamento-trilhas-${hoje}.csv`
}

function nomeDoCabecalho(cabecalho: unknown): string | null {
  if (typeof cabecalho !== 'string') {
    return null
  }
  const encontrado = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cabecalho)
  return encontrado ? decodeURIComponent(encontrado[1]) : null
}

/**
 * Com `responseType: 'blob'` o corpo de erro também chega como Blob — sem
 * lê-lo, a mensagem da API (ex.: formato inválido) se perderia.
 */
async function corpoDeErroEmBlob(
  error: unknown,
): Promise<ApiErrorResponse | undefined> {
  if (!axios.isAxiosError(error) || !(error.response?.data instanceof Blob)) {
    return undefined
  }
  try {
    return JSON.parse(await lerTexto(error.response.data)) as ApiErrorResponse
  } catch {
    return undefined
  }
}

/** `FileReader` em vez de `Blob.text()`, que o jsdom dos testes não tem. */
function lerTexto(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(String(leitor.result))
    leitor.onerror = () => reject(leitor.error)
    leitor.readAsText(blob)
  })
}

/**
 * Baixa o acompanhamento em CSV com os mesmos filtros da listagem. Devolve o
 * arquivo; salvá-lo no disco é papel da tela.
 */
export async function exportarAcompanhamento(
  filtro: AtribuicaoFiltro = {},
): Promise<ArquivoExportado> {
  try {
    const resposta = await api.get<Blob>('/api/atribuicoes/exportar', {
      params: { ...apenasPreenchidos(filtro), formato: 'csv' },
      responseType: 'blob',
    })
    return {
      conteudo: resposta.data,
      nome:
        nomeDoCabecalho(resposta.headers['content-disposition']) ??
        nomePadraoDoCsv(),
    }
  } catch (error) {
    throw toServiceError(
      error,
      'Não foi possível exportar o acompanhamento.',
      await corpoDeErroEmBlob(error),
    )
  }
}
