import styles from './SeloSoAdmin.module.css'

/** Marca o conteúdo visível só para a gestão. Só quem é da gestão chega a vê-lo. */
export function SeloSoAdmin() {
  return (
    <span className={styles.selo} title="Visível apenas para administradores">
      <svg
        width="12"
        height="12"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="4.5"
          y="9"
          width="11"
          height="8"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M7 9V6.5a3 3 0 016 0V9"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
      Só admin
    </span>
  )
}
