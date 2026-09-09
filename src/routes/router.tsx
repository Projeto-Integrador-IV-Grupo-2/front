import {
  createBrowserRouter,
  Navigate,
  type RouteObject,
} from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout.tsx'
import { DashboardPage } from '../pages/DashboardPage.tsx'
import { LoginPage } from '../pages/LoginPage.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'

// Exportada à parte do router para poder ser reutilizada em testes com
// createMemoryRouter (ver router.test.tsx), sem depender do histórico real
// do navegador.
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [{ path: '/dashboard', element: <DashboardPage /> }],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <NotFoundPage /> },
]

export const router = createBrowserRouter(routes)
