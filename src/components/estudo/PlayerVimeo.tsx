import Player from '@vimeo/player'
import { useEffect, useRef } from 'react'
import styles from './PlayerVimeo.module.css'

/** A partir de quanto do vídeo assistido a etapa conta como concluída. */
export const LIMITE_CONCLUSAO = 0.9

interface PlayerVimeoProps {
  videoUrl: string
  titulo: string
  /** Chamado uma única vez, no fim do vídeo ou ao passar de 90%. */
  onConcluir: () => void
}

/**
 * Player oficial do Vimeo (`@vimeo/player`). Conclui a etapa sozinho quando o
 * vídeo termina ou passa de {@link LIMITE_CONCLUSAO}; o aviso sai uma vez só,
 * mesmo que o usuário volte e assista de novo.
 */
export function PlayerVimeo({
  videoUrl,
  titulo,
  onConcluir,
}: PlayerVimeoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // A callback muda a cada render da página; o player não precisa ser recriado por isso.
  const onConcluirRef = useRef(onConcluir)
  useEffect(() => {
    onConcluirRef.current = onConcluir
  }, [onConcluir])

  useEffect(() => {
    const elemento = containerRef.current
    if (!elemento) {
      return
    }
    let avisou = false
    const avisar = () => {
      if (!avisou) {
        avisou = true
        onConcluirRef.current()
      }
    }

    const player = new Player(elemento, {
      // O tipo do pacote exige o literal `https://vimeo.com/...`; o link já foi
      // validado pela API ao salvar o conteúdo.
      url: videoUrl as `https://vimeo.com/${string}`,
      responsive: true,
      title: false,
    })
    player.on('ended', avisar)
    player.on('timeupdate', ({ percent }: { percent: number }) => {
      if (percent >= LIMITE_CONCLUSAO) {
        avisar()
      }
    })

    return () => {
      player.off('ended')
      player.off('timeupdate')
      void player.destroy().catch(() => undefined)
    }
  }, [videoUrl])

  return (
    <div
      ref={containerRef}
      className={styles.player}
      aria-label={`Vídeo: ${titulo}`}
      role="region"
    />
  )
}
