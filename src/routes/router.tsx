import {
  createBrowserRouter,
  Navigate,
  type RouteObject,
} from 'react-router-dom'
import { ProtectedRoute } from '../components/auth/ProtectedRoute.tsx'
import { AppLayout } from '../components/layout/AppLayout.tsx'
import { DashboardPage } from '../pages/DashboardPage.tsx'
import { LoginPage } from '../pages/LoginPage.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'
import { UsuariosPage } from '../pages/UsuariosPage.tsx'
import { ROTAS } from './paths.ts'

// Exportada à parte do router para poder ser reutilizada em testes com
// createMemoryRouter (ver router.test.tsx), sem depender do histórico real
// do navegador.
export const routes: RouteObject[] = [
  {
    // Guarda toda a área autenticada: quem não tem sessão nem chega ao layout.
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: ROTAS.dashboard, element: <DashboardPage /> },
          {
            // Área administrativa: o perfil exigido fica na rota, não na página.
            element: <ProtectedRoute perfis={['ADMIN']} />,
            children: [{ path: ROTAS.usuarios, element: <UsuariosPage /> }],
          },
        ],
      },
    ],
  },
  { path: ROTAS.login, element: <LoginPage /> },
  { path: '/', element: <Navigate to={ROTAS.dashboard} replace /> },
  { path: '*', element: <NotFoundPage /> },
]

export const router = createBrowserRouter(routes)
