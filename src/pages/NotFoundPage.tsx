import { Link } from 'react-router-dom'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>Página não encontrada</h1>
        <p className={styles.hint}>
          O endereço acessado não existe ou foi movido.
        </p>
        <Link to="/" className={styles.link}>
          Voltar para o início
        </Link>
      </div>
    </div>
  )
}
