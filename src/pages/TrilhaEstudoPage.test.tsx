import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TrilhaEstudoPage } from './TrilhaEstudoPage.tsx'
import { caminhoEstudo, ROTAS } from '../routes/paths.ts'
import {
  criarEtapa,
  criarProgressoTrilha,
  criarTrilhaDetalhe,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

// O player real carrega um iframe do Vimeo, que o jsdom não roda. O mock guarda
// os ouvintes para o teste disparar "timeupdate" e "ended" como o Vimeo faria.
const ouvintes = vi.hoisted(() => new Map<string, (dados: unknown) => void>())
vi.mock('@vimeo/player', () => ({
  default: class {
    on(evento: string, ouvinte: (dados: unknown) => void) {
      ouvintes.set(evento, ouvinte)
    }
    off() {}
    destroy() {
      return Promise.resolve()
    }
  },
}))

const TRILHA = criarTrilhaDetalhe()

function renderizar() {
  return renderizarComProvedores({
    rota: caminhoEstudo(TRILHA.id),
    usuario: criarUsuario({ papel: 'COLABORADOR' }),
    routes: [
      { path: ROTAS.trilhaEstudo, element: <TrilhaEstudoPage /> },
      { path: ROTAS.trilhaDetalhe, element: <p>detalhe</p> },
    ],
  })
}

function percentualNaTela(): string | null {
  return screen.getByRole('progressbar').getAttribute('aria-valuenow')
}

describe('TrilhaEstudoPage', () => {
  beforeEach(() => {
    ouvintes.clear()
  })

  it('concluir uma etapa atualiza a etapa e a barra sem recarregar', async () => {
    const user = userEvent.setup()
    let buscasDaTrilha = 0
    server.use(
      http.get('*/api/trilhas/:id', () => {
        buscasDaTrilha++
        return HttpResponse.json(TRILHA)
      }),
      http.get('*/api/trilhas/:id/etapas', () =>
        HttpResponse.json([
          criarEtapa({ id: 'e1', ordem: 1, titulo: 'Manual' }),
          criarEtapa({ id: 'e2', ordem: 2, titulo: 'Política' }),
        ]),
      ),
      http.post('*/api/trilhas/:id/etapas/:etapaId/concluir', ({ params }) =>
        HttpResponse.json({
          etapaId: params.etapaId,
          progresso: criarProgressoTrilha({
            status: 'EM_ANDAMENTO',
            percentual: 50,
          }),
        }),
      ),
    )

    renderizar()

    await user.click(
      await screen.findByRole('button', { name: 'Concluir etapa' }),
    )

    expect(
      await screen.findByText('Etapa concluída. Progresso: 50%.'),
    ).toBeInTheDocument()
    expect(percentualNaTela()).toBe('50')
    expect(screen.getByText('Etapa concluída')).toBeInTheDocument()
    expect(buscasDaTrilha).toBe(1)
  })

  it('concluir a última etapa mostra a trilha como concluída', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/trilhas/:id/etapas', () =>
        HttpResponse.json([criarEtapa({ id: 'e1', titulo: 'Única' })]),
      ),
      http.post('*/api/trilhas/:id/etapas/:etapaId/concluir', () =>
        HttpResponse.json({
          etapaId: 'e1',
          progresso: criarProgressoTrilha({
            status: 'CONCLUIDA',
            percentual: 100,
          }),
        }),
      ),
    )

    renderizar()

    await user.click(
      await screen.findByRole('button', { name: 'Concluir etapa' }),
    )

    expect(
      await screen.findByText('Parabéns! Você concluiu a trilha.'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Concluída').length).toBeGreaterThan(0)
    expect(percentualNaTela()).toBe('100')
  })

  it('etapa de vídeo se conclui sozinha ao passar de 90%, uma vez só', async () => {
    let conclusoes = 0
    server.use(
      http.get('*/api/trilhas/:id/etapas', () =>
        HttpResponse.json([
          criarEtapa({
            id: 'v1',
            titulo: 'Vídeo de boas-vindas',
            conteudo: {
              ...criarEtapa().conteudo,
              tipo: 'VIDEO',
              videoUrl: 'https://vimeo.com/22439234',
              corpo: null,
            },
          }),
        ]),
      ),
      http.post('*/api/trilhas/:id/etapas/:etapaId/concluir', () => {
        conclusoes++
        return HttpResponse.json({
          etapaId: 'v1',
          progresso: criarProgressoTrilha({
            status: 'CONCLUIDA',
            percentual: 100,
          }),
        })
      }),
    )

    renderizar()

    await screen.findByRole('region', { name: 'Vídeo: Vídeo de boas-vindas' })
    expect(
      screen.queryByRole('button', { name: 'Concluir etapa' }),
    ).not.toBeInTheDocument()

    ouvintes.get('timeupdate')?.({ percent: 0.5 })
    expect(conclusoes).toBe(0)
    ouvintes.get('timeupdate')?.({ percent: 0.91 })
    ouvintes.get('ended')?.({})

    await waitFor(() => expect(conclusoes).toBe(1))
    expect(
      await screen.findByText('Parabéns! Você concluiu a trilha.'),
    ).toBeInTheDocument()
  })

  it('mostra o erro da API quando a conclusão falha', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/trilhas/:id/etapas', () =>
        HttpResponse.json([criarEtapa()]),
      ),
      http.post('*/api/trilhas/:id/etapas/:etapaId/concluir', () =>
        HttpResponse.json({ message: 'Etapa não encontrada' }, { status: 404 }),
      ),
    )

    renderizar()

    await user.click(
      await screen.findByRole('button', { name: 'Concluir etapa' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Etapa não encontrada',
    )
  })
})
