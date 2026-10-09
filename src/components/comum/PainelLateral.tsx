import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import styles from './PainelLateral.module.css'

interface PainelLateralProps {
  titulo: string
  subtitulo?: string
  onFechar: () => void
  children: ReactNode
}

const FOCAVEIS =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'

/**
 * Painel modal que entra pela direita (no celular, ocupa a tela). Só cuida da
 * moldura: foco preso dentro, Esc e clique no fundo fecham, e o foco volta a
 * quem abriu. O conteúdo — e a busca dos dados — é de quem usa.
 */
export function PainelLateral({
  titulo,
  subtitulo,
  onFechar,
  children,
}: PainelLateralProps) {
  const idBase = useId()
  const caixaRef = useRef<HTMLDivElement>(null)
  const fecharRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Guardado na montagem: é quem tinha o foco quando o painel abriu.
    const anterior = document.activeElement as HTMLElement | null
    fecharRef.current?.focus()
    return () => anterior?.focus()
  }, [])

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'Escape') {
      evento.stopPropagation()
      onFechar()
      return
    }
    if (evento.key !== 'Tab' || !caixaRef.current) {
      return
    }
    const focaveis = caixaRef.current.querySelectorAll<HTMLElement>(FOCAVEIS)
    const primeiro = focaveis[0]
    const ultimo = focaveis[focaveis.length - 1]
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault()
      ultimo?.focus()
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault()
      primeiro?.focus()
    }
  }

  return (
    <div className={styles.fundo} onClick={onFechar}>
      <div
        ref={caixaRef}
        className={styles.painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${idBase}-titulo`}
        onKeyDown={aoTeclar}
        // O clique dentro do painel não pode chegar ao fundo, que fecha.
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className={styles.cabecalho}>
          <div>
            <h2 id={`${idBase}-titulo`} className={styles.titulo}>
              {titulo}
            </h2>
            {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
          </div>
          <button
            ref={fecharRef}
            type="button"
            className={styles.fechar}
            onClick={onFechar}
            aria-label="Fechar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div className={styles.corpo}>{children}</div>
      </div>
    </div>
  )
}
