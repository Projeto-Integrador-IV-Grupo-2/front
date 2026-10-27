/**
 * Observer das trilhas: o `trilhaService` publica o que aconteceu e quem se
 * interessa assina, sem a ação conhecer quem ouve. Hoje quem assina é a seção
 * "Sugeridas para você" — trilha iniciada sai das sugestões.
 */
export type EventoTrilha = { tipo: 'trilha-iniciada'; trilhaId: string }

export type OuvinteTrilha = (evento: EventoTrilha) => void

const ouvintes = new Set<OuvinteTrilha>()

export function emitirEventoTrilha(evento: EventoTrilha): void {
  ouvintes.forEach((ouvinte) => ouvinte(evento))
}

/** Devolve a função que cancela a assinatura (pronta para um efeito). */
export function assinarEventosTrilha(ouvinte: OuvinteTrilha): () => void {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}
