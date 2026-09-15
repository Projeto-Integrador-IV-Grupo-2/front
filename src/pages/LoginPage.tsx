import { useLocation, useNavigate } from 'react-router-dom'
import { LoginForm } from '../components/LoginForm.tsx'
import { ROTAS } from '../routes/paths.ts'
import styles from './LoginPage.module.css'

interface EstadoDeOrigem {
  from?: { pathname?: string }
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // O ProtectedRoute guarda em `state.from` a página que o usuário tentou
  // abrir; depois do login ele volta para lá em vez de cair sempre no
  // dashboard. Link direto para /usuarios sobrevive ao desvio pelo login.
  const origem = (location.state as EstadoDeOrigem | null)?.from?.pathname

  function handleSuccess() {
    navigate(origem ?? ROTAS.dashboard, { replace: true })
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
