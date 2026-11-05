import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.ts'
import { ROTAS } from '../../routes/paths.ts'
import styles from './ProtectedRoute.module.css'

/**
 * Rota de layout para as telas de quem não está logado ("esqueci minha
 * senha" e redefinição): quem já tem sessão vai para a tela inicial. Enquanto
 * a sessão salva é validada, espera — decidir antes faria a tela piscar.
 */
export function RotaPublica() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <p className={styles.carregando} role="status">
        Carregando...
      </p>
    )
  }
  if (isAuthenticated) {
    return <Navigate to={ROTAS.dashboard} replace />
  }
  return <Outlet />
}
