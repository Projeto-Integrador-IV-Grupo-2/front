import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from './LoginForm.tsx'
import { AuthProvider } from '../contexts/AuthContext.tsx'
import * as authService from '../services/authService.ts'
import { AuthError } from '../services/authService.ts'
import { getStoredToken } from '../services/api.ts'
import type { LoginResponse } from '../types/auth.ts'
import type { User } from '../types/user.ts'
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

function renderForm(onSuccess = vi.fn()) {
  render(
    <AuthProvider>
      <LoginForm onSuccess={onSuccess} />
    </AuthProvider>,
  )
  return { onSuccess }
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
  password: string,
) {
  if (email) {
    await user.type(screen.getByLabelText('E-mail'), email)
  }
  if (password) {
    await user.type(screen.getByLabelText('Senha'), password)
  }
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('LoginForm', () => {
  it('rejeita o envio com campos vazios, sem chamar a API', async () => {
    const user = userEvent.setup()
    const loginSpy = vi.spyOn(authService, 'login')
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Informe o e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument()
    expect(loginSpy).not.toHaveBeenCalled()
  })

  it('rejeita e-mail com formato inválido, sem chamar a API', async () => {
    const user = userEvent.setup()
    const loginSpy = vi.spyOn(authService, 'login')
    renderForm()

    await fillAndSubmit(user, 'nao-e-um-email', '123456')

    expect(
      await screen.findByText('Informe um e-mail válido.'),
    ).toBeInTheDocument()
    expect(loginSpy).not.toHaveBeenCalled()
  })

  it('mostra carregamento no botão e impede envio duplicado', async () => {
    const user = userEvent.setup()
    let resolveLogin!: (value: LoginResponse) => void
    const pending = new Promise<LoginResponse>((resolve) => {
      resolveLogin = resolve
    })
    const loginSpy = vi.spyOn(authService, 'login').mockReturnValueOnce(pending)
    renderForm()

    const submitButton = screen.getByRole('button', { name: 'Entrar' })
    await user.type(screen.getByLabelText('E-mail'), mockUser.email)
    await user.type(screen.getByLabelText('Senha'), '123456')
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveTextContent('Entrando...')

    // Um segundo clique enquanto a requisição está em andamento não deve
    // disparar um novo envio (o botão desabilitado já impede o clique).
    await user.click(submitButton)
    expect(loginSpy).toHaveBeenCalledTimes(1)

    resolveLogin(respostaDeLogin())
    await waitFor(() => expect(submitButton).not.toBeDisabled())
  })

  it('chama onSuccess com o usuário após um login válido', async () => {
    const user = userEvent.setup()
    vi.spyOn(authService, 'login').mockResolvedValueOnce(respostaDeLogin())
    const { onSuccess } = renderForm()

    await user.click(screen.getByRole('radio', { name: /Colaborador/ }))
    await fillAndSubmit(user, mockUser.email, '123456')

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(mockUser))
  })

  it('recusa a conta de administrador com "Colaborador" marcado, sem abrir sessão', async () => {
    const user = userEvent.setup()
    const admin = criarUsuario({ papel: 'ADMIN' })
    vi.spyOn(authService, 'login').mockResolvedValueOnce(respostaDeLogin(admin))
    const { onSuccess } = renderForm()

    await user.click(screen.getByRole('radio', { name: /Colaborador/ }))
    await fillAndSubmit(user, admin.email, '123456')

    expect(
      await screen.findByText(
        'Esta conta é de administração. Selecione “Administrador” para entrar.',
      ),
    ).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(getStoredToken()).toBeNull()
  })

  it('recusa a conta de colaborador com "Administrador" marcado', async () => {
    const user = userEvent.setup()
    vi.spyOn(authService, 'login').mockResolvedValueOnce(respostaDeLogin())
    const { onSuccess } = renderForm()

    await fillAndSubmit(user, mockUser.email, '123456')

    expect(
      await screen.findByText(
        'Esta conta é de colaborador. Selecione “Colaborador” para entrar.',
      ),
    ).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('aceita gestor com "Administrador" marcado (área de gestão)', async () => {
    const user = userEvent.setup()
    const gestor = criarUsuario({ papel: 'GESTOR' })
    vi.spyOn(authService, 'login').mockResolvedValueOnce(
      respostaDeLogin(gestor),
    )
    const { onSuccess } = renderForm()

    await fillAndSubmit(user, gestor.email, '123456')

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(gestor))
  })

  it('exibe mensagem amigável para credenciais inválidas, sem quebrar a tela', async () => {
    const user = userEvent.setup()
    vi.spyOn(authService, 'login').mockRejectedValueOnce(
      new AuthError('Credenciais inválidas', 401),
    )
    renderForm()

    await fillAndSubmit(user, mockUser.email, 'senha-errada')

    expect(
      await screen.findByText('E-mail ou senha inválidos.'),
    ).toBeInTheDocument()
  })

  it('exibe mensagem específica para usuário desativado', async () => {
    const user = userEvent.setup()
    vi.spyOn(authService, 'login').mockRejectedValueOnce(
      new AuthError('Usuário desativado', 403),
    )
    renderForm()

    await fillAndSubmit(user, mockUser.email, '123456')

    expect(
      await screen.findByText(
        'Sua conta está desativada. Fale com um administrador.',
      ),
    ).toBeInTheDocument()
  })
})
