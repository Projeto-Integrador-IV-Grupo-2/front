import styles from './AcoesDeConteudo.module.css'

/**
 * Lápis (editar) e lixeira (excluir), discretos: só ícones, sem moldura até
 * o hover. O título do conteúdo entra no rótulo porque os botões se repetem
 * em cada cartão.
 */
export function AcoesDeConteudo({
  titulo,
  onEditar,
  onExcluir,
}: {
  titulo: string
  onEditar: () => void
  onExcluir: () => void
}) {
  return (
    <div className={styles.acoes}>
      <button
        type="button"
        className={styles.botao}
        onClick={onEditar}
        aria-label={`Editar ${titulo}`}
        title="Editar"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        className={`${styles.botao} ${styles.perigo}`}
        onClick={onExcluir}
        aria-label={`Excluir ${titulo}`}
        title="Excluir"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10M8.5 9v4.5M11.5 9v4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}
