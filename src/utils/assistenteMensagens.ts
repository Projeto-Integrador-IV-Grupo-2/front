interface MensagemBase {
  id: string
  criadaEm: string
}

export interface MensagemUsuario extends MensagemBase {
  tipo: 'usuario'
  conteudo: string
  /** Enviada enquanto a IA respondia outra: espera a vez. */
  naFila?: boolean
}

/** Documento citado numa resposta. Sem `documentoId`, a tela busca pelo título. */
export interface FonteResposta {
  titulo: string
  documentoId?: string
}

export interface MensagemAssistente extends MensagemBase {
  tipo: 'assistente'
  conteudo: string
  fontes: FonteResposta[]
}

export interface MensagemErro extends MensagemBase {
  tipo: 'erro'
  conteudo: string
  status?: number
  perguntaId: string
  pergunta: string
}

export type MensagemConversa =
  MensagemUsuario | MensagemAssistente | MensagemErro

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

/**
 * Junta as fontes por documento: a API manda um item por trecho, e o mesmo
 * documento repetido na tela não ajuda ninguém. Prefere a lista detalhada
 * (com ID); sem ela, usa os títulos.
 */
export function fontesUnicas(
  titulos: string[] = [],
  detalhadas: Array<{ documentoId: string; titulo: string }> = [],
): FonteResposta[] {
  const vistas = new Map<string, FonteResposta>()
  for (const fonte of detalhadas) {
    const chave = fonte.documentoId || fonte.titulo
    if (!vistas.has(chave)) {
      vistas.set(chave, {
        titulo: fonte.titulo,
        documentoId: fonte.documentoId,
      })
    }
  }
  if (vistas.size === 0) {
    for (const titulo of titulos) {
      if (!vistas.has(titulo)) vistas.set(titulo, { titulo })
    }
  }
  return [...vistas.values()]
}

/** Factory Method: toda resposta do assistente carrega a coleção de fontes. */
export function criarMensagemAssistente(
  conteudo: string,
  fontes: FonteResposta[] = [],
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
