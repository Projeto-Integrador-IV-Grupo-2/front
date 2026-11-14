import { criarCanalDeEventos } from './canalDeEventos.ts'

/**
 * Observer das trilhas: o `trilhaService` e o `etapaService` publicam o que
 * aconteceu, e quem se interessa assina, sem a ação conhecer quem ouve. Hoje
 * quem assina é a seção "Sugeridas para você": trilha iniciada ou inativada
 * sai das sugestões. O comportamento do canal está em `canalDeEventos.ts`.
 *
 * - `trilha-iniciada`: o usuário começou a trilha (iniciar, concluir uma
 *   etapa ou mudar o progresso).
 * - `trilha-inativada`: a trilha saiu do catálogo.
 */
export type EventoTrilha =
  | { tipo: 'trilha-iniciada'; trilhaId: string }
  | { tipo: 'trilha-inativada'; trilhaId: string }

export type OuvinteTrilha = (evento: EventoTrilha) => void

const canal = criarCanalDeEventos<EventoTrilha>('trilhas')

export function emitirEventoTrilha(evento: EventoTrilha): void {
  canal.publicar(evento)
}

/** Devolve a função que cancela a assinatura (pronta para um efeito). */
export function assinarEventosTrilha(ouvinte: OuvinteTrilha): () => void {
  return canal.assinar(ouvinte)
}
