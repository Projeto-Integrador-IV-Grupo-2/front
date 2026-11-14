/**
 * Observer sem framework: um canal onde quem faz a ação publica e quem se
 * interessa assina, sem um conhecer o outro.
 *
 * Todos os canais do app (`conteudoEvents`, `eventosTrilha`) são criados
 * aqui, para se comportarem do mesmo jeito:
 * - `assinar` devolve a função que cancela a assinatura (pronta para o
 *   cleanup de um `useEffect`);
 * - quem assina ou cancela durante um aviso não muda quem recebe esse aviso
 *   (o aviso percorre uma cópia da lista);
 * - um ouvinte que lança erro não impede os outros de serem avisados, nem
 *   derruba a ação que publicou. O erro vai para o console.
 */
export interface CanalDeEventos<T> {
  assinar(ouvinte: (evento: T) => void): () => void
  publicar(evento: T): void
}

export function criarCanalDeEventos<T>(nome: string): CanalDeEventos<T> {
  const ouvintes = new Set<(evento: T) => void>()

  return {
    assinar(ouvinte) {
      ouvintes.add(ouvinte)
      return () => {
        ouvintes.delete(ouvinte)
      }
    },
    publicar(evento) {
      for (const ouvinte of [...ouvintes]) {
        try {
          ouvinte(evento)
        } catch (erro) {
          console.error(`Ouvinte do canal "${nome}" falhou`, erro)
        }
      }
    },
  }
}
