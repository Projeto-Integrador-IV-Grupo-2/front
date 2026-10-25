/** Formato de um arquivo anexado — espelha o enum `TipoArquivo` da API. */
export type TipoArquivo = 'PDF' | 'DOCX' | 'TXT' | 'MD'

/** Arquivo no formato do record `ArquivoResponse`. */
export interface Arquivo {
  id: string
  conteudoId: string
  nomeOriginal: string
  tipo: TipoArquivo
  mimeType: string
  tamanhoBytes: number
  criadoEm: string
}

/** Arquivo já baixado da API, pronto para o navegador salvar. */
export interface ArquivoBaixado {
  conteudo: Blob
  nome: string
}

export const ROTULOS_TIPO_ARQUIVO: Record<TipoArquivo, string> = {
  PDF: 'PDF',
  DOCX: 'Word (DOCX)',
  TXT: 'Texto',
  MD: 'Markdown',
}

/**
 * Formatos aceitos, do jeito que a API os reconhece (`TipoArquivo` +
 * `DetectorDeTipoDeArquivo`). A extensão é o que o usuário vê; o `mimeType` é
 * o que o navegador costuma mandar — alguns sistemas mandam vazio ou
 * `application/octet-stream` para `.md`, então a extensão é o critério
 * principal e o MIME só complementa.
 */
export const FORMATOS_ACEITOS: ReadonlyArray<{
  tipo: TipoArquivo
  extensao: string
  mimeType: string
}> = [
  { tipo: 'PDF', extensao: '.pdf', mimeType: 'application/pdf' },
  {
    tipo: 'DOCX',
    extensao: '.docx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  { tipo: 'TXT', extensao: '.txt', mimeType: 'text/plain' },
  { tipo: 'MD', extensao: '.md', mimeType: 'text/markdown' },
]

/** Valor do atributo `accept` do input de arquivo. */
export const ACCEPT_ARQUIVOS = FORMATOS_ACEITOS.map(
  ({ extensao }) => extensao,
).join(',')

/**
 * Teto do upload, igual ao `DOCUMENTOS_TAMANHO_MAXIMO` da API (10 MB). O front
 * recusa antes de enviar para o usuário não esperar o upload inteiro só para
 * receber 400 no fim.
 */
export const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024

/** "2,4 MB" — tamanho legível, no formato pt-BR. */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const unidades = ['KB', 'MB', 'GB']
  let valor = bytes / 1024
  let unidade = 0
  while (valor >= 1024 && unidade < unidades.length - 1) {
    valor /= 1024
    unidade += 1
  }
  const casas = valor < 10 ? 1 : 0
  return `${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })} ${unidades[unidade]}`
}
