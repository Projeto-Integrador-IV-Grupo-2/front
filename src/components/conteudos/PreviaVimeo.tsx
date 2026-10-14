import { urlDeIncorporacao } from './vimeo.ts'
import styles from './PreviaVimeo.module.css'

interface PreviaVimeoProps {
  link: string | null | undefined
  titulo: string
}

/** Pré-visualização do vídeo no formulário; some quando o link não é do Vimeo. */
export function PreviaVimeo({ link, titulo }: PreviaVimeoProps) {
  const src = urlDeIncorporacao(link)
  if (!src) {
    return null
  }
  return (
    <div className={styles.previa}>
      <iframe
        src={src}
        title={`Pré-visualização: ${titulo || 'vídeo'}`}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
