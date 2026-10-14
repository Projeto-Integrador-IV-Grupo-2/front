import { useEffect, useId, type ReactNode } from 'react'
import styles from './Modal.module.css'

interface ModalProps {
  titulo: string
  subtitulo?: string
  largo?: boolean
  onFechar: () => void
  children: (tituloId: string) => ReactNode
}

/** Moldura de diálogo dos cadastros de conteúdo: backdrop, título, Esc fecha. */
export function Modal({
  titulo,
  subtitulo,
  largo,
  onFechar,
  children,
}: ModalProps) {
  const tituloId = useId()

  useEffect(() => {
    function fecharComEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onFechar()
      }
    }
    document.addEventListener('keydown', fecharComEsc)
    return () => document.removeEventListener('keydown', fecharComEsc)
  }, [onFechar])

  return (
    <div className={styles.backdrop} onClick={onFechar}>
      <div
        className={
          largo ? `${styles.modal} ${styles.modalLargo}` : styles.modal
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.cabecalho}>
          <div>
            <h2 id={tituloId}>{titulo}</h2>
            {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
          </div>
          <button
            type="button"
            className={styles.fechar}
            onClick={onFechar}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        {children(tituloId)}
      </div>
    </div>
  )
}
