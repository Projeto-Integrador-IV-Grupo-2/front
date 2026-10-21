import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import {
  criarDashboardColaborador,
  criarDashboardGestao,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

const rotaDashboard = '/dashboard'

describe('DashboardPage', () => {
  it('mostra o dashboard pessoal e não solicita o painel de gestão', async () => {
    const dashboard = criarDashboardColaborador()
    const requisicaoGestao = vi.fn()
    server.use(
      http.get('*/api/dashboard/colaborador', () =>
        HttpResponse.json(dashboard),
      ),
      http.get('*/api/dashboard/gestao', () => {
        requisicaoGestao()
        return HttpResponse.json(criarDashboardGestao())
      }),
    )

    renderizarComProvedores({
      rota: rotaDashboard,
      usuario: criarUsuario({ papel: 'COLABORADOR' }),
    })

    expect(await screen.findByText('66,67%')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Suas trilhas' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Onboarding').length).toBeGreaterThan(0)
    expect(screen.getByText(/Você iniciou/)).toBeInTheDocument()
    expect(screen.getByText('Não iniciadas')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Indicadores gerais' }),
    ).not.toBeInTheDocument()
    expect(requisicaoGestao).not.toHaveBeenCalled()
  })

  it.each(['ADMIN', 'GESTOR'] as const)(
    'mostra o dashboard de gestão para %s com os valores da API',
    async (papel) => {
      const dashboard = criarDashboardGestao()
      const requisicaoColaborador = vi.fn()
      server.use(
        http.get('*/api/dashboard/colaborador', () => {
          requisicaoColaborador()
          return HttpResponse.json(criarDashboardColaborador())
        }),
        http.get('*/api/dashboard/gestao', () => HttpResponse.json(dashboard)),
      )

      renderizarComProvedores({
        rota: rotaDashboard,
        usuario: criarUsuario({ papel }),
      })

      expect(await screen.findByText('18 inícios')).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: 'Indicadores gerais' }),
      ).toBeInTheDocument()
      expect(screen.getAllByText('12').length).toBeGreaterThan(0)
      expect(screen.getByText('30%')).toBeInTheDocument()
      expect(screen.getByText('Áreas com mais atraso')).toBeInTheDocument()
      expect(screen.getByText('Trilhas mais iniciadas')).toBeInTheDocument()
      expect(screen.getByText('18 inícios')).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: 'Suas trilhas' }),
      ).not.toBeInTheDocument()

      const grafico = screen.getByRole('group', {
        name: /Atribuições por status/,
      })
      expect(within(grafico).getByText('14')).toBeInTheDocument()
      expect(requisicaoColaborador).not.toHaveBeenCalled()
    },
  )

  it('mostra erro sem desmontar a página do colaborador', async () => {
    server.use(
      http.get('*/api/dashboard/colaborador', () =>
        HttpResponse.json({ message: 'Falha no servidor' }, { status: 500 }),
      ),
    )

    renderizarComProvedores({
      rota: rotaDashboard,
      usuario: criarUsuario({ papel: 'COLABORADOR' }),
    })

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(
      screen.getByRole('heading', { name: 'Visão geral' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Veja seu progresso/)).toBeInTheDocument()
  })

  it('mostra erro do endpoint de gestão sem desmontar a página', async () => {
    server.use(
      http.get('*/api/dashboard/gestao', () =>
        HttpResponse.json({ message: 'Falha no servidor' }, { status: 500 }),
      ),
    )

    renderizarComProvedores({
      rota: rotaDashboard,
      usuario: criarUsuario({ papel: 'GESTOR' }),
    })

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(
      screen.getByRole('heading', { name: 'Indicadores gerais' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Acompanhe os indicadores/)).toBeInTheDocument()
  })

  it('isola erro de um bloco de gestão e mantém os outros indicadores', async () => {
    server.use(
      http.get('*/api/dashboard/gestao', () =>
        HttpResponse.json({
          ...criarDashboardGestao(),
          areasComMaisAtraso: 'resposta-invalida',
        }),
      ),
    )

    renderizarComProvedores({
      rota: rotaDashboard,
      usuario: criarUsuario({ papel: 'ADMIN' }),
    })

    expect(
      await screen.findByText('A API retornou uma lista de áreas inválida.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Trilhas ativas')).toBeInTheDocument()
    expect(screen.getAllByText('12').length).toBeGreaterThan(0)
    expect(screen.getByText('18 inícios')).toBeInTheDocument()
  })

  it('exibe estados vazios nas listas do dashboard de gestão', async () => {
    server.use(
      http.get('*/api/dashboard/gestao', () =>
        HttpResponse.json(
          criarDashboardGestao({
            trilhasAtivas: 0,
            atribuicoesPorStatus: {
              total: 0,
              naoIniciadas: 0,
              emAndamento: 0,
              concluidas: 0,
              atrasadas: 0,
            },
            taxaConclusao: 0,
            areasComMaisAtraso: [],
            trilhasMaisIniciadas: [],
          }),
        ),
      ),
    )

    renderizarComProvedores({
      rota: rotaDashboard,
      usuario: criarUsuario({ papel: 'GESTOR' }),
    })

    expect(
      await screen.findByText('Nenhuma área possui atribuições atrasadas.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Ainda não há eventos de início de trilhas registrados.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Ainda não há atribuições para resumir.'),
    ).toBeInTheDocument()
  })

  it('normaliza uma resposta 403 do endpoint de gestão', async () => {
    server.use(
      http.get('*/api/dashboard/gestao', () =>
        HttpResponse.json({}, { status: 403 }),
      ),
    )

    renderizarComProvedores({
      rota: rotaDashboard,
      usuario: criarUsuario({ papel: 'ADMIN' }),
    })

    expect(
      await screen.findAllByText(
        'Você não tem permissão para visualizar este dashboard.',
      ),
    ).not.toHaveLength(0)
    expect(
      screen.getByRole('heading', { name: 'Atribuições por status' }),
    ).toBeInTheDocument()
  })

  it('exibe estado vazio quando o colaborador ainda não tem dados de trilhas', async () => {
    server.use(
      http.get('*/api/dashboard/colaborador', () =>
        HttpResponse.json(
          criarDashboardColaborador({
            trilhasPorStatus: {
              total: 0,
              naoIniciadas: 0,
              emAndamento: 0,
              concluidas: 0,
              atrasadas: 0,
            },
            proximosPrazos: [],
            ultimasAtividades: [],
            percentualMedio: 0,
          }),
        ),
      ),
    )

    renderizarComProvedores({
      rota: rotaDashboard,
      usuario: criarUsuario({ papel: 'COLABORADOR' }),
    })

    expect(
      await screen.findByText('Você ainda não tem trilhas atribuídas.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Você não tem prazos nos próximos sete dias.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Suas interações com as trilhas aparecerão aqui.'),
    ).toBeInTheDocument()
  })
})
