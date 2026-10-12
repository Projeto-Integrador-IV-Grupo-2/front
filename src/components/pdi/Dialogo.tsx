import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { idErro } from './campo.ts'
import styles from './Dialogo.module.css'

interface DialogoProps {
  titulo: string
  subtitulo: string
  /** Enquanto salva, Esc e os botões de fechar ficam inertes. */
  ocupado: boolean
  onFechar: () => void
  children: ReactNode
}

/**
 * Casca dos diálogos do PDI, no mesmo molde de `TrilhaFormulario`: prende o
 * foco (Tab circula dentro), fecha com Esc e, ao sumir, devolve o foco a quem
 * o abriu. No celular vira uma folha presa à base (ver o CSS).
 */
export function Dialogo({
  titulo,
  subtitulo,
  ocupado,
  onFechar,
  children,
}: DialogoProps) {
  const idBase = useId()
  const caixaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    caixaRef.current
      ?.querySelector<HTMLElement>('input, select, textarea')
      ?.focus()
    return () => anterior?.focus()
  }, [])

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'Escape' && !ocupado) {
      evento.stopPropagation()
      onFechar()
      return
    }
    if (evento.key !== 'Tab' || !caixaRef.current) {
      return
    }
    const focaveis = caixaRef.current.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)',
    )
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
    <div className={styles.fundo}>
      <div
        ref={caixaRef}
        className={styles.caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${idBase}-titulo`}
        aria-describedby={`${idBase}-subtitulo`}
        onKeyDown={aoTeclar}
      >
        <div className={styles.cabecalho}>
          <h2 id={`${idBase}-titulo`} className={styles.titulo}>
            {titulo}
          </h2>
          <button
            type="button"
            className={styles.fechar}
            onClick={onFechar}
            disabled={ocupado}
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
        </div>
        <p id={`${idBase}-subtitulo`} className={styles.subtitulo}>
          {subtitulo}
        </p>
        {children}
      </div>
    </div>
  )
}

interface CampoProps {
  id: string
  rotulo: string
  /** Mensagem de erro do campo (da API ou local). */
  erro?: string
  cheio?: boolean
  /** Algo ao lado do rótulo, ex.: um botão "Nova competência". */
  acao?: ReactNode
  children: ReactNode
}

/**
 * Rótulo + controle + mensagem de erro. O controle recebe `aria-invalid` e
 * `aria-describedby` por quem o monta, usando `ariaDoCampo` (campo.ts).
 */
export function Campo({
  id,
  rotulo,
  erro,
  cheio = false,
  acao,
  children,
}: CampoProps) {
  return (
    <div className={`${styles.campo} ${cheio ? styles.cheio : ''}`}>
      {acao ? (
        <div className={styles.rotuloComAcao}>
          <label htmlFor={id}>{rotulo}</label>
          {acao}
        </div>
      ) : (
        <label htmlFor={id}>{rotulo}</label>
      )}
      {children}
      {erro && (
        <p id={idErro(id)} className={styles.erroCampo}>
          {erro}
        </p>
      )}
    </div>
  )
}
