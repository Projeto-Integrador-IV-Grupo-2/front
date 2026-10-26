/** Contexto persistido pela API (`ContextoChat`). */
export type AssistenteContexto = 'CONHECIMENTO' | 'TRILHAS'

/** Papel atribuído a cada mensagem (`PapelMensagem`). */
export type PapelMensagemAssistente = 'USUARIO' | 'ASSISTENTE'

/** DTO `SessaoResponse` da API. */
export interface AssistenteSessaoResponse {
  id: string
  contexto: AssistenteContexto
  titulo: string
  criadoEm: string
  atualizadoEm: string
}

/** DTO `MensagemResponse` retornado pelo backend. As fontes são títulos de documentos. */
export interface AssistenteMensagemResponse {
  id: string
  papel: PapelMensagemAssistente
  conteudo: string
  fontes: string[]
  criadoEm: string
}

/** DTO `PerguntaRequest`; `conteudo` é o campo oficial da API. */
// O backend também aceita `pergunta` como alias por compatibilidade.
export interface AssistentePerguntaRequest {
  conteudo: string
}

/** DTO `RespostaAssistenteResponse`: sessão atualizada e a troca completa. */
export interface AssistenteRespostaResponse {
  sessao: AssistenteSessaoResponse
  pergunta: AssistenteMensagemResponse
  resposta: AssistenteMensagemResponse
}
