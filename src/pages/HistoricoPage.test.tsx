import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { criarUsuario } from '../test/factories.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

describe('HistoricoPage', () => {
  it('agrupa as atividades por dia e filtra pela busca', async () => {
    const user = userEvent.setup()
    renderizarComProvedores({ rota: '/historico', usuario: criarUsuario() })

    expect(
      await screen.findByRole('heading', { name: 'Histórico' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hoje' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ontem' })).toBeInTheDocument()

    await user.type(
      screen.getByLabelText('Pesquisar no histórico'),
      'avaliacao',
    )

    expect(
      screen.getByText('Concluiu a avaliação de Fundamentos do Atendimento'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Hoje' }),
    ).not.toBeInTheDocument()
  })
})
