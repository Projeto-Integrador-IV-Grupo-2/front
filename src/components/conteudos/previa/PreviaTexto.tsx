import { useEffect, useState } from 'react'
import { lerTextoDoBlob } from '../../../utils/lerTextoDoBlob.ts'
import { useConteudoDoArquivo } from './useConteudoDoArquivo.ts'
import type { PreviaProps } from './PreviaProps.ts'
import styles from './Previa.module.css'

/** Quanto do arquivo é mostrado na prévia; o resto fica para o download. */
const LIMITE_DE_CARACTERES = 20_000

/**
 * Texto puro e Markdown. O conteúdo é renderizado como texto dentro de
 * `<pre>`, nunca como HTML: um documento enviado por um gestor não pode
 * virar marcação executada na tela de quem lê.
 */
export function PreviaTexto({ arquivo }: PreviaProps) {
  const { blob, carregando, erro } = useConteudoDoArquivo(arquivo)
  // Guarda de qual blob o texto saiu, para trocar de arquivo já renderizar
  // "carregando" sem um `setState` no começo do efeito.
  const [lido, setLido] = useState<{ de: Blob; texto: string } | null>(null)

  useEffect(() => {
    if (!blob) {
      return
    }
    let ativo = true
    lerTextoDoBlob(blob).then((conteudo) => {
      if (ativo) {
        setLido({ de: blob, texto: conteudo ?? '' })
      }
    })
    return () => {
      ativo = false
    }
  }, [blob])

  const texto = lido && lido.de === blob ? lido.texto : null

  if (carregando || (blob && texto === null)) {
    return (
      <p role="status" className={styles.estado}>
        Carregando pré-visualização…
      </p>
    )
  }

  if (erro || texto === null) {
    return (
      <p role="alert" className={styles.estado}>
        {erro ?? 'Não foi possível abrir a pré-visualização.'}
      </p>
    )
  }

  const cortado = texto.length > LIMITE_DE_CARACTERES

  return (
    <div>
      <pre className={styles.texto}>
        {cortado ? texto.slice(0, LIMITE_DE_CARACTERES) : texto}
      </pre>
      {cortado && (
        <p className={styles.estado}>
          Mostrando só o começo do arquivo. Baixe para ver o conteúdo completo.
        </p>
      )}
    </div>
  )
}
