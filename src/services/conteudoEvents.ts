/**
 * Aviso de que algum documento mudou (cadastro, edição, publicação,
 * despublicação ou arquivo novo).
 *
 * Observer sem framework: quem mexe no documento publica o aviso pelo
 * service, e quem mostra uma lista se inscreve para recarregar. Assim a
 * listagem não precisa saber que existe uma tela de detalhe mexendo nos
 * mesmos dados — nem o contrário.
 */

type Ouvinte = () => void

const ouvintes = new Set<Ouvinte>()

/** @returns função que cancela a inscrição (usar no cleanup do `useEffect`) */
export function aoMudarConteudos(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

export function avisarConteudosMudaram(): void {
  // Cópia antes de percorrer: um ouvinte pode se desinscrever ao ser avisado.
  for (const ouvinte of [...ouvintes]) {
    ouvinte()
  }
}
