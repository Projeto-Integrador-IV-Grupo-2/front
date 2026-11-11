/** Tipo da interação (enum `TipoInteracaoHistorico` da API). */
export const TIPOS_INTERACAO = [
  'TRILHA_ACESSADA',
  'TRILHA_INICIADA',
  'TRILHA_CONCLUIDA',
  'ASSISTENTE_CONSULTADO',
  'SENHA_REDEFINIDA',
] as const

export type TipoInteracao = (typeof TIPOS_INTERACAO)[number]

/**
 * Uma interação do histórico (record `HistoricoInteracaoResponse`).
 *
 * `detalhes` muda conforme o tipo: nas de trilha vem `trilhaId` e
 * `trilhaNome`; na consulta ao assistente vem só `encontrouFontes` e
 * `quantidadeFontes` — a API nunca guarda a pergunta nem a resposta.
 */
export interface InteracaoHistorico {
  id: string
  tipo: TipoInteracao
  detalhes: {
    trilhaId?: string
    trilhaNome?: string
    encontrouFontes?: boolean
    quantidadeFontes?: number
    [chave: string]: unknown
  }
  usuario: { id: string; nomeCompleto: string; email: string }
  criadoEm: string
}
