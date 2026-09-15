import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.ts'
import { ForbiddenPage } from '../../pages/ForbiddenPage.tsx'
import { ROTAS } from '../../routes/paths.ts'
import { temPermissao } from '../../routes/permissions.ts'
import type { UserRole } from '../../types/user.ts'
import styles from './ProtectedRoute.module.css'

interface ProtectedRouteProps {
  /** Perfis autorizados. Sem a prop, basta estar autenticado. */
  perfis?: UserRole[]
}

/**
 * Rota de layout que guarda tudo o que estiver abaixo dela.
 *
 * A ordem das decisões importa: enquanto a sessão salva está sendo validada
 * não dá para afirmar que o usuário é anônimo — decidir antes disso faria a
 * tela de login piscar a cada recarregamento com token válido.
 */
export function ProtectedRoute({ perfis }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <p className={styles.carregando} role="status">
        Carregando...
      </p>
    )
  }

  if (!isAuthenticated) {
    // `state.from` deixa o caminho pedido disponível para quem quiser
    // devolver o usuário a ele depois do login.
    return <Navigate to={ROTAS.login} replace state={{ from: location }} />
  }

  if (!temPermissao(perfis, user?.papel)) {
    // Renderiza no lugar do conteúdo em vez de redirecionar: a URL pedida
    // continua visível (ajuda o suporte) e o histórico do navegador fica intacto.
    return <ForbiddenPage />
  }

  return <Outlet />
}
