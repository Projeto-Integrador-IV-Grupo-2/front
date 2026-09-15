import { screen } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute.tsx'
import { setStoredToken } from '../../services/api.ts'
import { criarUsuario } from '../../test/factories.ts'
import { server } from '../../test/msw/server.ts'
import { renderizarComProvedores } from '../../test/renderWithProviders.tsx'

const AREA_INTERNA = <p>Conteúdo protegido</p>

function rotasDeTeste(perfis?: Parameters<typeof ProtectedRoute>[0]['perfis']) {
  return [
    {
      element: <ProtectedRoute perfis={perfis} />,
      children: [{ path: '/interna', element: AREA_INTERNA }],
    },
    { path: '/login', element: <h1>Login</h1> },
  ]
}

describe('ProtectedRoute', () => {
  it('mostra o estado de carregando enquanto valida a sessão salva', () => {
    setStoredToken('token-de-teste')
    // Resposta que nunca chega: prende o componente no estado de carregamento.
    server.use(http.get('*/api/auth/me', () => new Promise(() => {})))

    renderizarComProvedores({ rota: '/interna', routes: rotasDeTeste() })

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
  })

  it('redireciona para o login quando não há sessão', async () => {
    renderizarComProvedores({ rota: '/interna', routes: rotasDeTeste() })

    expect(
      await screen.findByRole('heading', { name: 'Login' }),
    ).toBeInTheDocument()
  })

  it('libera o conteúdo para qualquer perfil quando a rota não exige um', async () => {
    renderizarComProvedores({
      rota: '/interna',
      usuario: criarUsuario({ papel: 'COLABORADOR' }),
      routes: rotasDeTeste(),
    })

    expect(await screen.findByText('Conteúdo protegido')).toBeInTheDocument()
  })

  it('mostra acesso negado quando o perfil não está na lista da rota', async () => {
    renderizarComProvedores({
      rota: '/interna',
      usuario: criarUsuario({ papel: 'GESTOR' }),
      routes: rotasDeTeste(['ADMIN']),
    })

    expect(
      await screen.findByRole('heading', { name: 'Acesso negado' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
  })

  it('libera o conteúdo quando o perfil está na lista da rota', async () => {
    renderizarComProvedores({
      rota: '/interna',
      usuario: criarUsuario({ papel: 'ADMIN' }),
      routes: rotasDeTeste(['ADMIN']),
    })

    expect(await screen.findByText('Conteúdo protegido')).toBeInTheDocument()
  })
})
