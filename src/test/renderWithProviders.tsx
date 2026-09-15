import { render, type RenderResult } from '@testing-library/react'
import {
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { AuthProvider } from '../contexts/AuthContext.tsx'
import { routes as rotasDaAplicacao } from '../routes/router.tsx'
import { setStoredToken } from '../services/api.ts'
import type { User } from '../types/user.ts'
import { server } from './msw/server.ts'

interface RenderOptions {
  /** Caminho inicial do histórico em memória. */
  rota?: string
  /**
   * Usuário logado. Grava um token e responde `/api/auth/me` com ele —
   * é o mesmo caminho que a aplicação percorre ao recarregar a página.
   */
  usuario?: User | null
  /** Rotas alternativas, para testar um componente de rota isolado. */
  routes?: RouteObject[]
}

/** Monta a aplicação (ou um trecho de rotas) com sessão e mocks HTTP prontos. */
export function renderizarComProvedores({
  rota = '/',
  usuario = null,
  routes = rotasDaAplicacao,
}: RenderOptions = {}): RenderResult {
  if (usuario) {
    setStoredToken('token-de-teste')
    server.use(http.get('*/api/auth/me', () => HttpResponse.json(usuario)))
  }

  const memoryRouter = createMemoryRouter(routes, { initialEntries: [rota] })

  return render(
    <AuthProvider>
      <RouterProvider router={memoryRouter} />
    </AuthProvider>,
  )
}
