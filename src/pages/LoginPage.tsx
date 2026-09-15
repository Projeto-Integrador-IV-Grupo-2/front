import { useNavigate } from 'react-router-dom'
import { LoginForm } from '../components/LoginForm.tsx'
import type { User } from '../types/user.ts'
import styles from './LoginPage.module.css'

function getRedirectPath(user: User): string {
  switch (user.papel) {
    case 'ADMIN':
    case 'GESTOR':
    case 'COLABORADOR':
      // Todos os perfis caem no dashboard por enquanto — áreas específicas
      // por perfil entram junto das rotas protegidas (próximos cards).
      return '/dashboard'
  }
}

export function LoginPage() {
  const navigate = useNavigate()

  function handleSuccess(user: User) {
    navigate(getRedirectPath(user), { replace: true })
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>Login</h1>
        <LoginForm onSuccess={handleSuccess} />
      </div>
    </div>
  )
}
