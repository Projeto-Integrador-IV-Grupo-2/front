import axios from 'axios'
import { api } from './api.ts'
import {
  HTTP_STATUS,
  MENSAGENS_DE_ERRO,
  normalizarErro,
  type MensagensPorStatus,
  type OpcoesDeErro,
} from '../utils/errorHandler.ts'
import type { ApiErrorResponse, ApiFieldError } from '../types/api.ts'
import type {
  ArquivoExportado,
  AtribuicaoAcompanhamento,
  AtribuicaoDetalhe,
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
 * Textos do acompanhamento que vencem a mensagem da API: o 403 diz do que é a
 * permissão, e a mensagem de um 500 é técnica demais para quem está na tela.
 */
const MENSAGENS_DO_ACOMPANHAMENTO: MensagensPorStatus = {
  [HTTP_STATUS.FORBIDDEN]:
    'Você não tem permissão para acompanhar as trilhas da equipe.',
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: MENSAGENS_DE_ERRO.ERRO_DO_SERVIDOR,
}

function toServiceError(
  error: unknown,
  fallbackMessage: string,
  opcoes: OpcoesDeErro = {},
): AtribuicaoServiceError {
  const { message, status, fieldErrors } = normalizarErro(
    error,
    fallbackMessage,
    {
      corpo: opcoes.corpo,
      mensagens: { ...MENSAGENS_DO_ACOMPANHAMENTO, ...opcoes.mensagens },
    },
  )
  return new AtribuicaoServiceError(message, status, fieldErrors)
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
    throw toServiceError(
      error,
      'Não foi possível carregar as trilhas do colaborador.',
      {
        mensagens: {
          [HTTP_STATUS.NOT_FOUND]: 'Colaborador não encontrado.',
        },
      },
    )
  }
}

/** Uma atribuição com as etapas da trilha e o que o colaborador já concluiu. */
export async function buscarAtribuicao(
  atribuicaoId: string,
  config?: { signal?: AbortSignal },
): Promise<AtribuicaoDetalhe> {
  try {
    const { data } = await api.get<AtribuicaoDetalhe>(
      `/api/atribuicoes/${encodeURIComponent(atribuicaoId)}`,
      { signal: config?.signal },
    )
    return data
  } catch (error) {
    throw toServiceError(
      error,
      'Não foi possível carregar o andamento do colaborador.',
      {
        mensagens: {
          [HTTP_STATUS.NOT_FOUND]: 'Atribuição não encontrada.',
        },
      },
    )
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
    throw toServiceError(error, 'Não foi possível exportar o acompanhamento.', {
      corpo: await corpoDeErroEmBlob(error),
    })
  }
}
