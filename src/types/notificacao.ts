/** Tipos de notificação que a API gera hoje (enum `TipoNotificacao`). */
export const TIPOS_NOTIFICACAO = [
  'TRILHA_ATRIBUIDA',
  'PRAZO_PROXIMO',
  'PRAZO_VENCIDO',
  'TRILHA_CONCLUIDA',
  'CONTEUDO_PUBLICADO',
  'TRILHA_INATIVADA',
] as const

export type TipoNotificacao = (typeof TIPOS_NOTIFICACAO)[number]

/** Notificação do usuário logado (`NotificacaoResponse` da API). */
export interface Notificacao {
  id: string
  /**
   * `string` além dos tipos conhecidos: a API pode ganhar um tipo novo antes
   * do front, e a notificação ainda precisa aparecer (com ícone genérico).
   */
  tipo: TipoNotificacao | (string & {})
  titulo: string
  mensagem: string
  /** Rota do front para onde o clique leva; `null` quando não leva a nada. */
  link: string | null
  lida: boolean
  lidaEm: string | null
  criadaEm: string
}

/** Resposta de `GET /api/notificacoes/nao-lidas/total`. */
export interface TotalNaoLidas {
  total: number
}
