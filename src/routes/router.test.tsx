import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { getStoredToken, setStoredToken } from '../services/api.ts'
import { criarUsuario } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

describe('router', () => {
  it('manda quem não está autenticado para a tela de login', async () => {
    renderizarComProvedores({ rota: '/dashboard' })

    expect(
      await screen.findByRole('heading', { name: 'Login' }),
    ).toBeInTheDocument()
  })

  it('leva a raiz ao dashboard, que por sua vez exige sessão', async () => {
    renderizarComProvedores({ rota: '/' })

    expect(
      await screen.findByRole('heading', { name: 'Login' }),
    ).toBeInTheDocument()
  })

  it('renderiza o dashboard dentro do layout base para um usuário autenticado', async () => {
    renderizarComProvedores({ rota: '/dashboard', usuario: criarUsuario() })

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Nexo')).toBeInTheDocument()
  })

  it('restaura a sessão salva ao recarregar a página', async () => {
    // Token salvo e nenhuma sessão em memória: é o cenário de um F5.
    setStoredToken('token-de-teste')
    server.use(
      http.get('*/api/auth/me', () =>
        HttpResponse.json(
          criarUsuario({ nomeCompleto: 'Bruno Lima', papel: 'ADMIN' }),
        ),
      ),
    )

    renderizarComProvedores({ rota: '/usuarios' })

    // Chegar à área de ADMIN prova que o usuário restaurado é o do /me, não
    // um autenticado genérico.
    expect(
      await screen.findByRole('heading', { name: 'Usuários' }),
    ).toBeInTheDocument()
  })

  it('encerra a sessão quando o token salvo não vale mais', async () => {
    setStoredToken('token-vencido')
    server.use(
      http.get('*/api/auth/me', () =>
        HttpResponse.json({ message: 'Sessão expirada' }, { status: 401 }),
      ),
    )

    renderizarComProvedores({ rota: '/dashboard' })

    expect(
      await screen.findByRole('heading', { name: 'Login' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(getStoredToken()).toBeNull())
  })

  it('nega a área administrativa a um colaborador, sem deslogar', async () => {
    renderizarComProvedores({
      rota: '/usuarios',
      usuario: criarUsuario({ papel: 'COLABORADOR' }),
    })

    expect(
      await screen.findByRole('heading', { name: 'Acesso negado' }),
    ).toBeInTheDocument()
    // Continua logado e navegando: o layout e o menu seguem no lugar.
    expect(getStoredToken()).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('leva o usuário ao destino que ele tentou abrir antes do login', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json({
          token: 'token-de-teste',
          tipo: 'Bearer',
          expiraEm: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          usuario: criarUsuario({ papel: 'ADMIN' }),
        }),
      ),
      http.get('*/api/auth/me', () =>
        HttpResponse.json(criarUsuario({ papel: 'ADMIN' })),
      ),
    )

    renderizarComProvedores({ rota: '/usuarios' })

    await user.type(await screen.findByLabelText('E-mail'), 'admin@nexo.com')
    await user.type(screen.getByLabelText('Senha'), 'admin123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(
      await screen.findByRole('heading', { name: 'Usuários' }),
    ).toBeInTheDocument()
  })

  it('libera a área administrativa para o administrador', async () => {
    renderizarComProvedores({
      rota: '/usuarios',
      usuario: criarUsuario({ papel: 'ADMIN' }),
    })

    expect(
      await screen.findByRole('heading', { name: 'Usuários' }),
    ).toBeInTheDocument()
  })

  it('renderiza a página 404 para uma rota desconhecida', async () => {
    renderizarComProvedores({ rota: '/rota-que-nao-existe' })

    expect(
      await screen.findByRole('heading', { name: /página não encontrada/i }),
    ).toBeInTheDocument()
  })
})
