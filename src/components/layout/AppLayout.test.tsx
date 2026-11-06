import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getStoredToken } from '../../services/api.ts'
import { criarUsuario } from '../../test/factories.ts'
import { renderizarComProvedores } from '../../test/renderWithProviders.tsx'

/**
 * O mock global de matchMedia em src/test/setup.ts responde sempre "desktop".
 * Para exercitar o menu mobile é preciso sobrescrevê-lo no próprio teste.
 */
function simularTelaEstreita() {
  vi.stubGlobal(
    'matchMedia',
    (query: string): MediaQueryList =>
      ({
        matches: true,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * Busca pelo rótulo, não por papel: o jsdom aplica o CSS do módulo mas não
 * avalia `@media`, então o botão continua com a regra base `display: none` e
 * some das consultas por papel mesmo na tela estreita.
 */
async function encontrarBotaoDoMenu(): Promise<HTMLButtonElement> {
  const rotulo = await screen.findByText('Abrir menu')
  const botao = rotulo.closest('button')
  if (!botao) {
    throw new Error('O rótulo "Abrir menu" não está dentro de um <button>.')
  }
  return botao
}

describe('AppLayout', () => {
  it('mostra o item de usuários para o administrador', async () => {
    renderizarComProvedores({
      rota: '/dashboard',
      usuario: criarUsuario({ papel: 'ADMIN' }),
    })

    expect(
      await screen.findByRole('link', { name: 'Usuários' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Visão geral' }),
    ).toBeInTheDocument()
  })

  it.each(['GESTOR', 'COLABORADOR'] as const)(
    'esconde o item de usuários do perfil %s',
    async (papel) => {
      renderizarComProvedores({
        rota: '/dashboard',
        usuario: criarUsuario({ papel }),
      })

      expect(
        await screen.findByRole('link', { name: 'Visão geral' }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: 'Usuários' }),
      ).not.toBeInTheDocument()
    },
  )

  it('sai da conta, limpa o token e volta para o login', async () => {
    const user = userEvent.setup()
    renderizarComProvedores({ rota: '/dashboard', usuario: criarUsuario() })

    await user.click(
      await screen.findByRole('button', { name: 'Sair da conta' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Entrar' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(getStoredToken()).toBeNull())
  })

  it('no desktop o sino fica na barra lateral, e há um só', async () => {
    renderizarComProvedores({ rota: '/dashboard', usuario: criarUsuario() })

    const sinos = await screen.findAllByRole('button', {
      name: /^Notificações/,
      hidden: true,
    })
    expect(sinos).toHaveLength(1)
    expect(sinos[0].closest('aside')).not.toBeNull()
  })

  it('no celular o sino vai para a barra superior, e há um só', async () => {
    simularTelaEstreita()
    renderizarComProvedores({ rota: '/dashboard', usuario: criarUsuario() })

    await encontrarBotaoDoMenu()
    const sinos = screen.getAllByRole('button', {
      name: /^Notificações/,
      hidden: true,
    })
    expect(sinos).toHaveLength(1)
    expect(sinos[0].closest('header')).not.toBeNull()
  })

  it('abre e fecha o menu no botão de navegação em tela estreita', async () => {
    simularTelaEstreita()
    const user = userEvent.setup()
    renderizarComProvedores({ rota: '/dashboard', usuario: criarUsuario() })

    const alternar = await encontrarBotaoDoMenu()
    expect(alternar).toHaveAttribute('aria-expanded', 'false')
    expect(alternar).toHaveAttribute('aria-controls', 'primary-navigation')

    await user.click(alternar)
    expect(alternar).toHaveAttribute('aria-expanded', 'true')

    await user.click(alternar)
    expect(alternar).toHaveAttribute('aria-expanded', 'false')
  })

  it('fecha o menu ao navegar por um item em tela estreita', async () => {
    simularTelaEstreita()
    const user = userEvent.setup()
    renderizarComProvedores({
      rota: '/dashboard',
      usuario: criarUsuario({ papel: 'ADMIN' }),
    })

    const alternar = await encontrarBotaoDoMenu()
    await user.click(alternar)
    await user.click(screen.getByRole('link', { name: 'Usuários' }))

    expect(
      await screen.findByRole('heading', { name: 'Usuários' }),
    ).toBeInTheDocument()
    expect(alternar).toHaveAttribute('aria-expanded', 'false')
  })

  it('oferece um atalho para o conteúdo que o teclado consegue receber', async () => {
    renderizarComProvedores({ rota: '/dashboard', usuario: criarUsuario() })

    const atalho = await screen.findByRole('link', {
      name: 'Pular para o conteúdo',
    })
    expect(atalho).toHaveAttribute('href', '#conteudo-principal')

    // O jsdom não executa o salto por fragmento; o que importa verificar é que
    // o destino aceita foco — sem tabIndex o pulo move só a barra de rolagem.
    const conteudo = document.getElementById('conteudo-principal')
    expect(conteudo).toHaveAttribute('tabindex', '-1')
    conteudo?.focus()
    expect(conteudo).toHaveFocus()
  })

  it('devolve o foco ao botão do menu depois de navegar em tela estreita', async () => {
    simularTelaEstreita()
    const user = userEvent.setup()
    renderizarComProvedores({
      rota: '/dashboard',
      usuario: criarUsuario({ papel: 'ADMIN' }),
    })

    const alternar = await encontrarBotaoDoMenu()
    await user.click(alternar)
    await user.click(screen.getByRole('link', { name: 'Usuários' }))

    // Com o menu recolhido, o link clicado some: o foco não pode cair no body.
    await waitFor(() => expect(alternar).toHaveFocus())
  })

  it('troca o rótulo do botão conforme o menu abre e fecha', async () => {
    simularTelaEstreita()
    const user = userEvent.setup()
    renderizarComProvedores({ rota: '/dashboard', usuario: criarUsuario() })

    const alternar = await encontrarBotaoDoMenu()
    expect(alternar).toHaveTextContent('Abrir menu')

    await user.click(alternar)
    expect(alternar).toHaveTextContent('Fechar menu')
  })

  it('começa no tema claro e o botão Tema alterna para o escuro e de volta, lembrando a escolha', async () => {
    const user = userEvent.setup()
    renderizarComProvedores({ rota: '/dashboard', usuario: criarUsuario() })

    const botao = await screen.findByRole('button', {
      name: 'Mudar para o tema escuro',
    })
    expect(document.documentElement).not.toHaveAttribute('data-theme')

    await user.click(botao)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem('nexo:tema')).toBe('escuro')

    await user.click(
      screen.getByRole('button', { name: 'Mudar para o tema claro' }),
    )
    expect(document.documentElement).not.toHaveAttribute('data-theme')
    expect(localStorage.getItem('nexo:tema')).toBe('claro')
  })
})
