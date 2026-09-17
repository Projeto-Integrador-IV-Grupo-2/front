import { render, screen } from '@testing-library/react'
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

    await user.type(screen.getByLabelText('E-mail'), mockUser.email)
    await user.type(screen.getByLabelText('Senha'), '123456')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(
      await screen.findByRole('heading', { name: 'Visão geral' }),
    ).toBeInTheDocument()
  })
})
