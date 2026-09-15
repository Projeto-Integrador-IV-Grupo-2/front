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
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it.each(['GESTOR', 'COLABORADOR'] as const)(
    'esconde o item de usuários do perfil %s',
    async (papel) => {
      renderizarComProvedores({
        rota: '/dashboard',
        usuario: criarUsuario({ papel }),
      })

      expect(
        await screen.findByRole('link', { name: 'Dashboard' }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: 'Usuários' }),
      ).not.toBeInTheDocument()
    },
  )

  it('sai da conta, limpa o token e volta para o login', async () => {
    const user = userEvent.setup()
    renderizarComProvedores({ rota: '/dashboard', usuario: criarUsuario() })

    await user.click(await screen.findByRole('button', { name: 'Sair' }))

    expect(
      await screen.findByRole('heading', { name: 'Login' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(getStoredToken()).toBeNull())
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

  it('oferece o atalho para pular direto ao conteúdo', async () => {
    renderizarComProvedores({ rota: '/dashboard', usuario: criarUsuario() })

    const atalho = await screen.findByRole('link', {
      name: 'Pular para o conteúdo',
    })
    expect(atalho).toHaveAttribute('href', '#conteudo-principal')
    expect(document.getElementById('conteudo-principal')).toBeInTheDocument()
  })
})
