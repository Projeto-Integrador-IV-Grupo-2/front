import { screen, waitFor, within } from '@testing-library/react'
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
      await screen.findByRole('heading', { name: 'Entrar' }),
    ).toBeInTheDocument()
  })

  it('leva a raiz ao dashboard, que por sua vez exige sessão', async () => {
    renderizarComProvedores({ rota: '/' })

    expect(
      await screen.findByRole('heading', { name: 'Entrar' }),
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
      await screen.findByRole('heading', { name: 'Entrar' }),
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
    expect(
      screen.getByRole('button', { name: 'Sair da conta' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('nega Categorias (dentro de Áreas) ao colaborador aberta pela URL', async () => {
    renderizarComProvedores({
      rota: '/areas/categorias',
      usuario: criarUsuario({ papel: 'COLABORADOR' }),
    })

    expect(
      await screen.findByRole('heading', { name: 'Acesso negado' }),
    ).toBeInTheDocument()
  })

  it.each(['/areas', '/conteudos'])(
    '%s é tela de gestão: o colaborador não tem o item nem a rota',
    async (rota) => {
      renderizarComProvedores({
        rota,
        usuario: criarUsuario({ papel: 'COLABORADOR' }),
      })

      expect(
        await screen.findByRole('heading', { name: 'Acesso negado' }),
      ).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Áreas' })).toBeNull()
      expect(screen.queryByRole('link', { name: 'Conteúdos' })).toBeNull()
      // As telas dele continuam no menu.
      expect(
        screen.getByRole('link', { name: 'Conhecimento' }),
      ).toBeInTheDocument()
    },
  )

  it('Categorias fica numa aba de Áreas, não no menu, e marca Áreas no menu', async () => {
    const user = userEvent.setup()
    renderizarComProvedores({
      rota: '/areas',
      usuario: criarUsuario({ papel: 'ADMIN' }),
    })

    const abas = await screen.findByRole('navigation', {
      name: 'Cadastros de apoio',
    })
    await user.click(within(abas).getByRole('link', { name: 'Categorias' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Categorias' }),
    ).toBeInTheDocument()
    // A tela trocou: as abas são outras. O menu lateral só tem "Áreas",
    // que continua marcado.
    const abasCategorias = screen.getByRole('navigation', {
      name: 'Cadastros de apoio',
    })
    const itemAreas = screen
      .getAllByRole('link', { name: 'Áreas' })
      .find((link) => !abasCategorias.contains(link))
    expect(itemAreas).toHaveAttribute('aria-current', 'page')
    expect(
      screen
        .getAllByRole('link', { name: 'Categorias' })
        .every((link) => abasCategorias.contains(link)),
    ).toBe(true)
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
