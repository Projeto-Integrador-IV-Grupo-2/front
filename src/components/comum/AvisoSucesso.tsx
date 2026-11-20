import { useEffect } from 'react'
import styles from './AvisoSucesso.module.css'

/** Tempo na tela: mensagens longas (ex.: "salvo, mas o arquivo X falhou") ficam mais. */
function duracao(mensagem: string): number {
  return Math.min(10000, 3500 + mensagem.length * 40)
}

/**
 * Aviso de sucesso flutuante: aparece no canto da tela e some sozinho, sem
 * ocupar a largura da página. Também fecha no ×.
 *
 * A região `role="status"` fica sempre no DOM (vazia quando não há aviso):
 * live region criada junto com a mensagem não é anunciada por parte dos
 * leitores de tela.
 */
export function AvisoSucesso({
  mensagem,
  onSumir,
}: {
  mensagem: string | null
  /** Chamado quando o tempo acaba ou no ×: quem usa limpa o próprio estado. */
  onSumir: () => void
}) {
  useEffect(() => {
    if (!mensagem) return
    const timer = window.setTimeout(onSumir, duracao(mensagem))
    return () => window.clearTimeout(timer)
    // O tempo recomeça só quando a mensagem muda, não a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagem])

  return (
    <div role="status" aria-live="polite" className={styles.regiao}>
      {mensagem && (
        <div className={styles.aviso}>
          <svg
            className={styles.icone}
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="10"
              cy="10"
              r="7.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M6.8 10.2l2.1 2.1 4.3-4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className={styles.texto}>{mensagem}</p>
          <button
            type="button"
            className={styles.fechar}
            onClick={onSumir}
            aria-label="Fechar aviso"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
