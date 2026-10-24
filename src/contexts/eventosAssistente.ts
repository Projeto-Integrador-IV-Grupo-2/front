import type { SessaoAssistente } from '../types/assistente.ts'

/**
 * Observer do assistente: a área de conversa publica o que aconteceu e quem se
 * interessa assina, sem um conhecer o outro. Hoje quem assina é o histórico
 * (a conversa que recebeu mensagem sobe para o topo).
 */
export type EventoAssistente = {
  /** Conversa criada ou que acabou de receber mensagem: vai para o topo. */
  tipo: 'sessao-atualizada'
  sessao: SessaoAssistente
}

export type OuvinteAssistente = (evento: EventoAssistente) => void

export interface CanalAssistente {
  emitir: (evento: EventoAssistente) => void
  /** Devolve a função que cancela a assinatura (pronta para um efeito). */
  assinar: (ouvinte: OuvinteAssistente) => () => void
}

export function criarCanalAssistente(): CanalAssistente {
  const ouvintes = new Set<OuvinteAssistente>()
  return {
    emitir(evento) {
      ouvintes.forEach((ouvinte) => ouvinte(evento))
    },
    assinar(ouvinte) {
      ouvintes.add(ouvinte)
      return () => {
        ouvintes.delete(ouvinte)
      }
    },
  }
}
