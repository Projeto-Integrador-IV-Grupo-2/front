import { useLocation, useNavigate } from 'react-router-dom'
import { LoginForm } from '../components/LoginForm.tsx'
import { LogoIcon } from '../components/Logo.tsx'
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
      <aside className={styles.brandPanel}>
        <LogoIcon className={styles.logo} />

        <div className={styles.brandContent}>
          <span className={styles.brandLabel}>Nexo</span>
          <h1 className={styles.brandHeadline}>
            Uma central para o conhecimento e o desenvolvimento da sua equipe.
          </h1>
          <p className={styles.brandDescription}>
            Documentos, códigos, processos, trilhas e planos de desenvolvimento
            em um só lugar — com um assistente de IA que responde qualquer
            dúvida sobre a empresa.
          </p>
        </div>

        <p className={styles.brandFooter}>© Nexo — plataforma corporativa</p>
      </aside>

      <div className={styles.formPanel}>
        <div className={styles.formCard}>
          <h2>Entrar</h2>
          <p className={styles.subtitle}>Acesse com sua conta corporativa.</p>
          <LoginForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  )
}
