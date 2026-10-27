/**
 * Contratos do assistente de IA. Seguem os endpoints de sessões e mensagens
 * combinados para o backend (Task 7): enquanto eles não existem, o
 * `assistenteService` responde com o mock em `services/mocks/assistenteMock.ts`.
 */

/** Quem escreveu a mensagem. */
export type PapelMensagem = 'USUARIO' | 'ASSISTENTE'

/** Uma conversa com o assistente, como aparece no histórico. */
export interface SessaoAssistente {
  id: string
  titulo: string
  criadoEm: string
  /** Muda a cada mensagem nova: é o que ordena o histórico. */
  atualizadoEm: string
}

export interface MensagemAssistente {
  id: string
  papel: PapelMensagem
  conteudo: string
  /** Conteúdos da base que embasaram a resposta (só nas do assistente). */
  fontes: string[]
  criadoEm: string
}

/** Resposta de `POST /api/assistente/sessoes/{id}/mensagens`. */
export interface RespostaPergunta {
  /** A sessão já com `atualizadoEm` novo. */
  sessao: SessaoAssistente
  pergunta: MensagemAssistente
  resposta: MensagemAssistente
}

export interface PaginacaoSessoes {
  page?: number
  size?: number
}
