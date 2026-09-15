import { Link } from 'react-router-dom'
import { ROTAS } from '../routes/paths.ts'
import styles from './ForbiddenPage.module.css'

/**
 * Tela de acesso negado (HTTP 403). O usuário continua logado — só não tem
 * permissão para o que pediu.
 */
export function ForbiddenPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.code}>403</p>
        <h1 className={styles.title}>Acesso negado</h1>
        <p className={styles.hint}>
          Sua conta não tem permissão para acessar esta área. Se você precisa
          dela, fale com um administrador.
        </p>
        {/* Leva ao dashboard, não à raiz: a raiz redireciona e poderia
            devolver o usuário à mesma área proibida. */}
        <Link to={ROTAS.dashboard} className={styles.link}>
          Voltar para o dashboard
        </Link>
      </div>
    </div>
  )
}
