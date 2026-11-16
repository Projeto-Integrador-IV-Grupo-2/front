import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { caminhoColaboradorNaTrilha } from '../routes/paths.ts'
import {
  criarAtribuicao,
  criarAtribuicaoDetalhe,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

const TRILHA = '44444444-4444-4444-4444-444444444444'
const rota = caminhoColaboradorNaTrilha(TRILHA, 'at-1')

describe('ColaboradorNaTrilhaPage', () => {
  it('mostra progresso, datas e o que o colaborador já viu', async () => {
    let pedido: string | null = null
    server.use(
      http.get('*/api/atribuicoes/:atribuicaoId', ({ params }) => {
        pedido = String(params.atribuicaoId)
        return HttpResponse.json(
          criarAtribuicaoDetalhe({
            atribuicao: criarAtribuicao({
              id: 'at-1',
              status: 'ATRASADA',
              percentual: 50,
              prazo: '2026-09-10',
            }),
          }),
        )
      }),
    )

    renderizarComProvedores({ rota, usuario: criarUsuario({ papel: 'ADMIN' }) })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ana Souza' }),
    ).toBeInTheDocument()
    expect(pedido).toBe('at-1')

    const etapas = screen.getByRole('region', {
      name: 'Etapas (1 de 2 vistas)',
    })
    const itens = within(etapas).getAllByRole('listitem')
    expect(itens).toHaveLength(2)
    expect(itens[0]).toHaveTextContent('Boas-vindas')
    expect(itens[0]).toHaveTextContent(/Vista em/)
    expect(itens[1]).toHaveTextContent('Cultura da empresa')
    expect(itens[1]).toHaveTextContent('Não vista')

    const progresso = screen.getByRole('region', { name: 'Progresso' })
    expect(within(progresso).getByText('Atrasada')).toBeInTheDocument()
    expect(within(progresso).getByText(/Prazo vencido em/)).toBeInTheDocument()
    expect(
      within(progresso).getByRole('progressbar', {
        name: 'Progresso de Ana Souza',
      }),
    ).toHaveAttribute('aria-valuenow', '50')

    const datas = screen.getByRole('region', { name: 'Linha do tempo' })
    expect(within(datas).getByText('Não concluiu')).toBeInTheDocument()
  })

  it('avisa quando a atribuição não existe', async () => {
    server.use(
      http.get('*/api/atribuicoes/:atribuicaoId', () =>
        HttpResponse.json({ message: 'não encontrada' }, { status: 404 }),
      ),
    )

    renderizarComProvedores({
      rota,
      usuario: criarUsuario({ papel: 'GESTOR' }),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Atribuição não encontrada',
    )
  })

  it('colaborador não abre o andamento de outra pessoa', async () => {
    renderizarComProvedores({
      rota,
      usuario: criarUsuario({ papel: 'COLABORADOR' }),
    })

    expect(
      await screen.findByRole('heading', {
        name: /acesso negado/i,
      }),
    ).toBeInTheDocument()
  })
})
