import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { TrilhaDetalhePage } from './TrilhaDetalhePage.tsx'
import { caminhoTrilha, ROTAS } from '../routes/paths.ts'
import {
  criarConteudo,
  criarEtapa,
  criarPagina,
  criarTrilhaDetalhe,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'
import type { User } from '../types/user.ts'

const TRILHA = criarTrilhaDetalhe()

function renderizar(usuario: User) {
  return renderizarComProvedores({
    rota: caminhoTrilha(TRILHA.id),
    usuario,
    routes: [{ path: ROTAS.trilhaDetalhe, element: <TrilhaDetalhePage /> }],
  })
}

describe('TrilhaDetalhePage — etapas (issue #39)', () => {
  it('colaborador estuda a trilha, mas não vê a montagem das etapas', async () => {
    renderizar(criarUsuario({ papel: 'COLABORADOR' }))

    expect(
      await screen.findByRole('link', { name: 'Estudar trilha' }),
    ).toHaveAttribute('href', `/trilhas/${TRILHA.id}/estudar`)
    expect(
      screen.queryByRole('heading', { name: 'Etapas da trilha' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Adicionar etapa' }),
    ).not.toBeInTheDocument()
  })

  it('gestor adiciona uma etapa escolhendo um conteúdo publicado', async () => {
    const user = userEvent.setup()
    let etapas = [criarEtapa({ id: 'e1', titulo: 'Manual' })]
    let pedido: unknown
    server.use(
      http.get('*/api/trilhas/:id/etapas', () => HttpResponse.json(etapas)),
      http.get('*/api/conteudos', ({ request }) => {
        expect(new URL(request.url).searchParams.get('status')).toBe(
          'PUBLICADO',
        )
        return HttpResponse.json(
          criarPagina([criarConteudo({ id: 'c2', titulo: 'Vídeo novo' })]),
        )
      }),
      http.post('*/api/trilhas/:id/etapas', async ({ request }) => {
        pedido = await request.json()
        etapas = [
          ...etapas,
          criarEtapa({ id: 'e2', ordem: 2, titulo: 'Vídeo novo' }),
        ]
        return HttpResponse.json(etapas[1], { status: 201 })
      }),
    )

    renderizar(criarUsuario({ papel: 'GESTOR' }))
    await user.click(
      await screen.findByRole('tab', { name: 'Etapas e informações' }),
    )

    const lista = await screen.findByRole('list', { name: 'Etapas da trilha' })
    expect(within(lista).getByText('Manual')).toBeInTheDocument()

    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Vídeo novo (Vídeo)' }),
      ).toBeInTheDocument(),
    )
    await user.selectOptions(screen.getByLabelText('Adicionar conteúdo'), 'c2')
    await user.click(screen.getByRole('button', { name: 'Adicionar etapa' }))

    expect(await within(lista).findByText('Vídeo novo')).toBeInTheDocument()
    expect(pedido).toEqual({ conteudoId: 'c2', titulo: null, descricao: null })
  })

  it('reordena com o botão de descer', async () => {
    const user = userEvent.setup()
    let ordem: unknown
    server.use(
      http.get('*/api/trilhas/:id/etapas', () =>
        HttpResponse.json([
          criarEtapa({ id: 'a', ordem: 1, titulo: 'A' }),
          criarEtapa({ id: 'b', ordem: 2, titulo: 'B' }),
        ]),
      ),
      http.patch('*/api/trilhas/:id/etapas/ordem', async ({ request }) => {
        ordem = await request.json()
        return HttpResponse.json([])
      }),
    )

    renderizar(criarUsuario({ papel: 'ADMIN' }))
    await user.click(
      await screen.findByRole('tab', { name: 'Etapas e informações' }),
    )

    await user.click(await screen.findByRole('button', { name: 'Descer A' }))

    await waitFor(() => expect(ordem).toEqual({ etapaIds: ['b', 'a'] }))
  })
})
