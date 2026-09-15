import { screen, waitFor } from '@testing-library/react'
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
    // Sem passar `usuario`: o token já está salvo e o handler padrão de
    // /api/auth/me responde — é exatamente o cenário de um F5.
    setStoredToken('token-de-teste')
    renderizarComProvedores({ rota: '/dashboard' })

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }),
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
    expect(getStoredToken()).not.toBeNull()
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
