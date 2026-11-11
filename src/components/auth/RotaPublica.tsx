import { Navigate, Outlet, useLocation } from 'react-router-dom'
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
  const location = useLocation()

  if (isLoading) {
    return (
      <p className={styles.carregando} role="status">
        Carregando...
      </p>
    )
  }
  const redefinicaoComToken =
    location.pathname === ROTAS.redefinirSenha &&
    Boolean(new URLSearchParams(location.search).get('token'))
  if (isAuthenticated && !redefinicaoComToken) {
    return <Navigate to={ROTAS.dashboard} replace />
  }
  return <Outlet />
}
