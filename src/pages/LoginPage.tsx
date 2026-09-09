import styles from './LoginPage.module.css'

/** Placeholder da tela de login — o formulário é adicionado no Card 15. */
export function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>Login</h1>
        <p className={styles.hint}>
          O formulário de login será adicionado aqui.
        </p>
      </div>
    </div>
  )
}
