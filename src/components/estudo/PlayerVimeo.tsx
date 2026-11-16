import Player from '@vimeo/player'
import { useEffect, useRef, useState } from 'react'
import { linkCanonico } from '../conteudos/vimeo.ts'
import styles from './PlayerVimeo.module.css'

/** A partir de quanto do vídeo assistido a etapa conta como concluída. */
export const LIMITE_CONCLUSAO = 0.9

interface PlayerVimeoProps {
  videoUrl: string
  titulo: string
  /** Chamado uma única vez, no fim do vídeo ou ao passar de 90%. */
  onConcluir: () => void
  /**
   * Chamado quando o vídeo não pôde ser carregado (removido, privado ou
   * Vimeo bloqueado na rede). A tela usa para liberar a conclusão manual.
   */
  onFalha?: () => void
}

/**
 * Player oficial do Vimeo (`@vimeo/player`). Conclui a etapa sozinho quando o
 * vídeo termina ou passa de {@link LIMITE_CONCLUSAO}; o aviso sai uma vez só,
 * mesmo que o usuário volte e assista de novo.
 *
 * Se o vídeo não carregar, mostra o motivo e o link para abrir no Vimeo, em
 * vez de uma caixa preta vazia.
 */
export function PlayerVimeo({
  videoUrl,
  titulo,
  onConcluir,
  onFalha,
}: PlayerVimeoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [falhou, setFalhou] = useState(false)
  // As callbacks mudam a cada render da página; o player não precisa ser recriado por isso.
  const onConcluirRef = useRef(onConcluir)
  const onFalhaRef = useRef(onFalha)
  useEffect(() => {
    onConcluirRef.current = onConcluir
    onFalhaRef.current = onFalha
  }, [onConcluir, onFalha])

  useEffect(() => {
    const elemento = containerRef.current
    if (!elemento) {
      return
    }
    let ativo = true
    let avisou = false
    const avisar = () => {
      if (!avisou) {
        avisou = true
        onConcluirRef.current()
      }
    }
    const falhar = () => {
      if (ativo) {
        setFalhou(true)
        onFalhaRef.current?.()
      }
    }

    let player: Player
    try {
      player = new Player(elemento, {
        // Conteúdos antigos podem ter outros formatos de link; o player só
        // precisa de `https://vimeo.com/{id}`.
        url: (linkCanonico(videoUrl) ??
          videoUrl) as `https://vimeo.com/${string}`,
        responsive: true,
        title: false,
      })
    } catch {
      falhar()
      return
    }
    player.on('ended', avisar)
    player.on('timeupdate', ({ percent }: { percent: number }) => {
      if (percent >= LIMITE_CONCLUSAO) {
        avisar()
      }
    })
    // `ready` rejeita quando o Vimeo não entrega o vídeo (404, privado, rede).
    void player.ready().catch(falhar)

    return () => {
      ativo = false
      player.off('ended')
      player.off('timeupdate')
      void player.destroy().catch(() => undefined)
    }
  }, [videoUrl])

  return (
    <>
      {falhou && (
        <div className={styles.falha} role="alert">
          <p>
            Não foi possível carregar este vídeo. Ele pode ter sido removido ou
            tornado privado no Vimeo, ou o Vimeo pode estar bloqueado na sua
            rede.
          </p>
          <a href={videoUrl} target="_blank" rel="noopener noreferrer">
            Tentar abrir no Vimeo
          </a>
        </div>
      )}
      <div
        ref={containerRef}
        className={styles.player}
        aria-label={`Vídeo: ${titulo}`}
        role="region"
        hidden={falhou}
      />
    </>
  )
}
