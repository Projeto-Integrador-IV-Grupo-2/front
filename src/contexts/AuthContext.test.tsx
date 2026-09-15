import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext.tsx'
import {
  getStoredToken,
  setStoredToken,
  UNAUTHORIZED_EVENT,
} from '../services/api.ts'
import * as authService from '../services/authService.ts'
import { useAuth } from '../hooks/useAuth.ts'
import type { User } from '../types/user.ts'
import type { LoginResponse } from '../types/auth.ts'
import { criarUsuario } from '../test/factories.ts'

const mockUser: User = criarUsuario()

function respostaDeLogin(usuario: User = mockUser): LoginResponse {
  return {
    token: 'abc123',
    tipo: 'Bearer',
    expiraEm: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    usuario,
  }
}

function AuthConsumer() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth()

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user-name">{user?.nomeCompleto ?? ''}</span>
      <button
        onClick={() => {
          login({ email: mockUser.email, senha: '123456' }).catch(() => {})
        }}
      >
        login
      </button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('AuthProvider', () => {
  it('inicia sem sessão quando não há token salvo', async () => {
    renderWithProvider()

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    )
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
  })

  it('restaura a sessão a partir do token salvo (mantém login ao recarregar)', async () => {
    setStoredToken('abc123')
    vi.spyOn(authService, 'fetchCurrentUser').mockResolvedValueOnce(mockUser)

    renderWithProvider()

    expect(screen.getByTestId('loading')).toHaveTextContent('true')

    await waitFor(() =>
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true'),
    )
    expect(screen.getByTestId('user-name')).toHaveTextContent('Ana Souza')
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
  })

  it('encerra a sessão quando o token salvo não é mais válido', async () => {
    setStoredToken('expirado')
    vi.spyOn(authService, 'fetchCurrentUser').mockRejectedValueOnce(
      new authService.AuthError('Sessão expirada', 401),
    )

    renderWithProvider()

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    )
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    expect(getStoredToken()).toBeNull()
  })

  it('login chama o serviço, guarda o token e autentica o usuário', async () => {
    const user = userEvent.setup()
    vi.spyOn(authService, 'login').mockResolvedValueOnce(respostaDeLogin())

    renderWithProvider()
    await user.click(screen.getByRole('button', { name: 'login' }))

    await waitFor(() =>
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true'),
    )
    expect(screen.getByTestId('user-name')).toHaveTextContent('Ana Souza')
    expect(getStoredToken()).toBe('abc123')
  })

  it('logout limpa o usuário e o token salvo', async () => {
    const user = userEvent.setup()
    vi.spyOn(authService, 'login').mockResolvedValueOnce(respostaDeLogin())

    renderWithProvider()
    await user.click(screen.getByRole('button', { name: 'login' }))
    await waitFor(() =>
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true'),
    )

    await user.click(screen.getByRole('button', { name: 'logout' }))

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    expect(getStoredToken()).toBeNull()
  })

  it('encerra a sessão ao receber o evento de 401 (ex.: disparado pelo Axios)', async () => {
    const user = userEvent.setup()
    vi.spyOn(authService, 'login').mockResolvedValueOnce(respostaDeLogin())

    renderWithProvider()
    await user.click(screen.getByRole('button', { name: 'login' }))
    await waitFor(() =>
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true'),
    )

    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))

    await waitFor(() =>
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false'),
    )
  })
})
