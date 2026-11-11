import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../contexts/AuthContext.tsx'
import { routes } from '../routes/router.tsx'
import * as authService from '../services/authService.ts'
import type { User } from '../types/user.ts'
import { criarUsuario } from '../test/factories.ts'

const mockUser: User = criarUsuario()

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('LoginPage', () => {
  it('redireciona para o dashboard após um login válido', async () => {
    const user = userEvent.setup()
    vi.spyOn(authService, 'login').mockResolvedValueOnce({
      token: 'abc123',
      tipo: 'Bearer',
      expiraEm: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      usuario: mockUser,
    })

    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ['/login'],
    })
    render(
      <AuthProvider>
        <RouterProvider router={memoryRouter} />
      </AuthProvider>,
    )

    // O usuário do teste é colaborador: a tela abre em "Administrador".
    await user.click(screen.getByRole('radio', { name: /Colaborador/ }))
    await user.type(screen.getByLabelText('E-mail'), mockUser.email)
    await user.type(screen.getByLabelText('Senha'), '123456')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(
      await screen.findByRole('heading', { name: 'Visão geral' }),
    ).toBeInTheDocument()
  })

  it('consome o aviso de redefinição e o limpa ao tentar entrar', async () => {
    const user = userEvent.setup()
    vi.spyOn(authService, 'login').mockRejectedValueOnce(new Error('falhou'))

    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: [
        {
          pathname: '/login',
          state: { aviso: 'Senha redefinida. Entre com a nova senha.' },
        },
      ],
    })
    render(
      <AuthProvider>
        <RouterProvider router={memoryRouter} />
      </AuthProvider>,
    )

    expect(
      await screen.findByText('Senha redefinida. Entre com a nova senha.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(memoryRouter.state.location.state).toBeNull())

    await user.click(screen.getByRole('radio', { name: /Colaborador/ }))
    await user.type(screen.getByLabelText('E-mail'), mockUser.email)
    await user.type(screen.getByLabelText('Senha'), 'senha-incorreta')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível entrar. Tente novamente.',
    )
    expect(
      screen.queryByText('Senha redefinida. Entre com a nova senha.'),
    ).not.toBeInTheDocument()
  })
})
