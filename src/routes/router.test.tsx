import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from './router.tsx'

function renderAt(path: string) {
  const memoryRouter = createMemoryRouter(routes, { initialEntries: [path] })
  return render(<RouterProvider router={memoryRouter} />)
}

describe('router', () => {
  it('redireciona a raiz para a tela de login', async () => {
    renderAt('/')

    expect(
      await screen.findByRole('heading', { name: 'Login' }),
    ).toBeInTheDocument()
  })

  it('renderiza o dashboard dentro do layout base', async () => {
    renderAt('/dashboard')

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Nexo')).toBeInTheDocument()
  })

  it('renderiza a página 404 para uma rota desconhecida', async () => {
    renderAt('/rota-que-nao-existe')

    expect(
      await screen.findByRole('heading', { name: /página não encontrada/i }),
    ).toBeInTheDocument()
  })
})
