import { api } from './api.ts'
import { avisarConteudosMudaram } from './conteudoEvents.ts'
import { normalizarErro } from '../utils/errorHandler.ts'
import { lerTextoDoBlob } from '../utils/lerTextoDoBlob.ts'
import type { ApiErrorResponse, ApiFieldError } from '../types/api.ts'
import {
  FORMATOS_ACEITOS,
  TAMANHO_MAXIMO_BYTES,
  formatarTamanho,
  type Arquivo,
  type ArquivoBaixado,
} from '../types/arquivo.ts'

/** Erro de arquivo já normalizado — mesmo formato de `ConteudoServiceError`. */
export class ArquivoServiceError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldError[]

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'ArquivoServiceError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function toServiceError(
  error: unknown,
  fallbackMessage: string,
  corpo?: ApiErrorResponse,
): ArquivoServiceError {
  const { message, status, fieldErrors } = normalizarErro(
    error,
    fallbackMessage,
    { corpo },
  )
  return new ArquivoServiceError(message, status, fieldErrors)
}

/**
 * Checagem local de tipo e tamanho, feita antes de gastar a rede. A API
 * refaz as duas — aqui é só para o usuário saber na hora.
 *
 * @returns a mensagem do problema, ou `null` quando o arquivo serve
 */
export function validarArquivo(arquivo: File): string | null {
  if (arquivo.size === 0) {
    return 'O arquivo está vazio.'
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return `O arquivo tem ${formatarTamanho(arquivo.size)} e o limite é ${formatarTamanho(
      TAMANHO_MAXIMO_BYTES,
    )}.`
  }
  if (!temFormatoAceito(arquivo)) {
    const aceitos = FORMATOS_ACEITOS.map(({ extensao }) => extensao).join(', ')
    return `Formato não aceito. Envie um arquivo ${aceitos}.`
  }
  return null
}

/**
 * A extensão é o critério principal: alguns sistemas mandam `.md` como
 * `application/octet-stream` ou sem tipo nenhum, e recusar por isso
 * esconderia um arquivo que a API aceita.
 */
function temFormatoAceito(arquivo: File): boolean {
  const nome = arquivo.name.toLowerCase()
  return FORMATOS_ACEITOS.some(
    ({ extensao, mimeType }) =>
      nome.endsWith(extensao) || arquivo.type === mimeType,
  )
}

export async function listarArquivos(conteudoId: string): Promise<Arquivo[]> {
  try {
    const { data } = await api.get<Arquivo[]>(
      `/api/conteudos/${conteudoId}/arquivos`,
    )
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível carregar os arquivos.')
  }
}

/**
 * Envia um arquivo ao documento. `onProgresso` recebe a porcentagem (0 a 100)
 * — é o `onUploadProgress` do Axios, ou seja, quem acompanha a barra se
 * inscreve no progresso do próprio envio.
 *
 * Usa o cliente único `api`: não existe outra instância do Axios para upload,
 * senão o token e o tratamento de 401 teriam de ser repetidos aqui.
 */
export async function enviarArquivo(
  conteudoId: string,
  arquivo: File,
  {
    onProgresso,
    signal,
  }: { onProgresso?: (porcentagem: number) => void; signal?: AbortSignal } = {},
): Promise<Arquivo> {
  const corpo = new FormData()
  corpo.append('arquivo', arquivo)
  try {
    const { data } = await api.post<Arquivo>(
      `/api/conteudos/${conteudoId}/arquivos`,
      corpo,
      {
        signal,
        onUploadProgress: ({ loaded, total }) => {
          if (!onProgresso) {
            return
          }
          // Sem `total` (resposta sem Content-Length) não dá para calcular a
          // porcentagem; a barra fica indeterminada em vez de saltar para 100.
          const referencia = total ?? arquivo.size
          if (referencia > 0) {
            onProgresso(Math.min(100, Math.round((loaded * 100) / referencia)))
          }
        },
      },
    )
    avisarConteudosMudaram()
    return data
  } catch (error) {
    throw toServiceError(error, 'Não foi possível enviar o arquivo.')
  }
}

/**
 * Baixa o arquivo com o nome original. O nome vem do `Content-Disposition`
 * que a API manda; se o cabeçalho não chegar (proxy que o remove, por
 * exemplo), vale o nome informado por quem chamou.
 */
export async function baixarArquivo(
  arquivoId: string,
  nomeDeReserva: string,
): Promise<ArquivoBaixado> {
  try {
    const resposta = await api.get<Blob>(
      `/api/arquivos/${arquivoId}/download`,
      {
        responseType: 'blob',
      },
    )
    return {
      conteudo: resposta.data,
      nome:
        nomeDoCabecalho(resposta.headers['content-disposition']) ??
        nomeDeReserva,
    }
  } catch (error) {
    throw toServiceError(
      error,
      'Não foi possível baixar o arquivo.',
      await corpoDoErro(error),
    )
  }
}

/** Lê `filename*=UTF-8''...` (preferido) ou `filename="..."`. */
function nomeDoCabecalho(cabecalho: unknown): string | undefined {
  if (typeof cabecalho !== 'string') {
    return undefined
  }
  const comCodificacao = /filename\*=UTF-8''([^;]+)/i.exec(cabecalho)
  if (comCodificacao) {
    try {
      return decodeURIComponent(comCodificacao[1].trim())
    } catch {
      // Cabeçalho mal formado: cai para o `filename=` simples abaixo.
    }
  }
  const simples = /filename="?([^";]+)"?/i.exec(cabecalho)
  return simples ? simples[1].trim() : undefined
}

/**
 * Num `responseType: 'blob'` o corpo do erro também vem como Blob (e, em
 * alguns ambientes, como texto). Sem ler esse corpo, a mensagem da API se
 * perderia e sobraria o texto genérico da operação.
 */
async function corpoDoErro(
  error: unknown,
): Promise<ApiErrorResponse | undefined> {
  const dados = (error as { response?: { data?: unknown } })?.response?.data
  const texto =
    typeof dados === 'string'
      ? dados
      : dados instanceof Blob
        ? await lerTextoDoBlob(dados)
        : undefined
  if (!texto) {
    return undefined
  }
  try {
    return JSON.parse(texto) as ApiErrorResponse
  } catch {
    return undefined
  }
}
