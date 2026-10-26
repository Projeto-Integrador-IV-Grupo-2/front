

interface MensagemBase {
  id: string
  criadaEm: string
}

export interface MensagemUsuario extends MensagemBase {
  tipo: 'usuario'
  conteudo: string
}

export interface MensagemAssistente extends MensagemBase {
  tipo: 'assistente'
  conteudo: string
  fontes: string[]
}

export interface MensagemErro extends MensagemBase {
  tipo: 'erro'
  conteudo: string
  status?: number
  perguntaId: string
  pergunta: string
}

export type MensagemConversa =
  | MensagemUsuario
  | MensagemAssistente
  | MensagemErro

let sequenciaMensagem = 0

function dadosBase(): MensagemBase {
  sequenciaMensagem += 1
  return {
    id: `mensagem-${Date.now()}-${sequenciaMensagem}`,
    criadaEm: new Date().toISOString(),
  }
}

/** Factory Method: mantém as mensagens do usuário no formato padronizado. */
export function criarMensagemUsuario(conteudo: string): MensagemUsuario {
  return { ...dadosBase(), tipo: 'usuario', conteudo }
}

/** Factory Method: toda resposta do assistente carrega a coleção de fontes. */
export function criarMensagemAssistente(
  conteudo: string,
  fontes: string[] = [],
): MensagemAssistente {
  return { ...dadosBase(), tipo: 'assistente', conteudo, fontes }
}

/** Factory Method: vincula o erro à pergunta original para permitir nova tentativa. */
export function criarMensagemErro(
  conteudo: string,
  perguntaId: string,
  pergunta: string,
  status?: number,
): MensagemErro {
  return {
    ...dadosBase(),
    tipo: 'erro',
    conteudo,
    perguntaId,
    pergunta,
    status,
  }
}
