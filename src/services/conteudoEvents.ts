import { criarCanalDeEventos } from './canalDeEventos.ts'

/**
 * Aviso de que algum documento mudou (cadastro, edição, publicação,
 * despublicação ou arquivo novo).
 *
 * Observer: quem mexe no documento publica o aviso pelo service, e quem
 * mostra uma lista se inscreve para recarregar. Assim a listagem não precisa
 * saber que existe uma tela de detalhe mexendo nos mesmos dados, nem o
 * contrário. O comportamento do canal está em `canalDeEventos.ts`.
 */
const canal = criarCanalDeEventos<void>('conteudos')

/** @returns função que cancela a inscrição (usar no cleanup do `useEffect`) */
export function aoMudarConteudos(ouvinte: () => void): () => void {
  return canal.assinar(() => ouvinte())
}

export function avisarConteudosMudaram(): void {
  canal.publicar()
}
