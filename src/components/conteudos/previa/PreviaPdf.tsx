import { useEffect, useMemo } from 'react'
import { useConteudoDoArquivo } from './useConteudoDoArquivo.ts'
import type { PreviaProps } from './PreviaProps.ts'
import styles from './Previa.module.css'

/**
 * PDF no visualizador do próprio navegador. O `<object>` cai no texto
 * alternativo quando o navegador não sabe abrir PDF embutido (é o caso de
 * boa parte dos celulares), e aí o botão de download da lista continua
 * valendo.
 */
export function PreviaPdf({ arquivo }: PreviaProps) {
  const { blob, carregando, erro } = useConteudoDoArquivo(arquivo)
  // A URL sai do blob no próprio render; o efeito abaixo só a revoga, porque
  // sem isso cada troca de arquivo deixaria o binário inteiro na memória.
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])

  useEffect(() => {
    if (!url) {
      return
    }
    return () => URL.revokeObjectURL(url)
  }, [url])

  if (carregando) {
    return (
      <p role="status" className={styles.estado}>
        Carregando pré-visualização…
      </p>
    )
  }

  if (erro || !url) {
    return (
      <p role="alert" className={styles.estado}>
        {erro ?? 'Não foi possível abrir a pré-visualização.'}
      </p>
    )
  }

  return (
    <object
      className={styles.pdf}
      data={url}
      type="application/pdf"
      aria-label={`Pré-visualização de ${arquivo.nomeOriginal}`}
    >
      <p className={styles.estado}>
        Seu navegador não abre PDF aqui. Use o botão de download para ver o
        arquivo.
      </p>
    </object>
  )
}
