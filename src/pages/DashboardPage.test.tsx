import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import {
  criarDashboardColaborador,
  criarDashboardGestao,
  criarPaginaTrilhas,
  criarProgressoTrilha,
  criarTrilhaResumo,
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
    // Mesmo arranjo do painel de gestão, só com os dados de quem entrou.
    for (const titulo of [
      'Seus indicadores',
      'Precisa de atenção',
      'Minhas trilhas',
      'Suas trilhas por status',
    ]) {
      expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument()
    }
    // O prazo da semana entra em "Precisa de atenção", com link para a trilha.
    const atencao = screen.getByRole('region', { name: 'Precisa de atenção' })
    expect(
      within(atencao).getByRole('link', { name: /Onboarding vence em/ }),
    ).toHaveAttribute('href', '/trilhas/44444444-4444-4444-4444-444444444444')
    expect(screen.getByText(/Você iniciou/)).toBeInTheDocument()
    expect(screen.getAllByText('Não iniciadas').length).toBeGreaterThan(0)
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

      // "Precisa de atenção" junta atrasos, áreas e o que não começou.
      const atencao = screen.getByRole('region', {
        name: 'Precisa de atenção',
      })
      expect(
        within(atencao).getByText('6 atribuições estão atrasadas'),
      ).toBeInTheDocument()
      expect(
        within(atencao).getByText('Tecnologia tem 4 atribuições atrasadas'),
      ).toBeInTheDocument()
      expect(
        within(atencao).getByText('8 atribuições ainda não foram iniciadas'),
      ).toBeInTheDocument()

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
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Veja seu progresso/)).toBeInTheDocument()
  })

  it('aceita tipos de histórico conhecidos e exibe as atividades de trilha', async () => {
    const base = criarDashboardColaborador()
    const atividade = base.ultimasAtividades[0]
    server.use(
      http.get('*/api/dashboard/colaborador', () =>
        HttpResponse.json({
          ...base,
          ultimasAtividades: [
            {
              ...atividade,
              id: 'assistente',
              tipo: 'ASSISTENTE_CONSULTADO',
              detalhes: { encontrouFontes: true },
            },
            {
              ...atividade,
              id: 'senha',
              tipo: 'SENHA_REDEFINIDA',
              detalhes: {},
            },
            atividade,
          ],
        }),
      ),
    )
    renderizarComProvedores({
      rota: rotaDashboard,
      usuario: criarUsuario({ papel: 'COLABORADOR' }),
    })

    expect(await screen.findByText(/Você iniciou/)).toBeInTheDocument()
    expect(
      screen.queryByText('A API retornou uma lista de atividades inválida.'),
    ).not.toBeInTheDocument()
  })

  it('rejeita tipos de interação que não existem na API', async () => {
    const base = criarDashboardColaborador()
    const atividade = base.ultimasAtividades[0]
    server.use(
      http.get('*/api/dashboard/colaborador', () =>
        HttpResponse.json({
          ...base,
          ultimasAtividades: [{ ...atividade, tipo: 'EVENTO_DESCONHECIDO' }],
        }),
      ),
    )
    renderizarComProvedores({
      rota: rotaDashboard,
      usuario: criarUsuario({ papel: 'COLABORADOR' }),
    })

    expect(
      await screen.findByText(
        'A API retornou uma lista de atividades inválida.',
      ),
    ).toBeInTheDocument()
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
    expect(screen.getByText(/precisa da sua atenção hoje/)).toBeInTheDocument()
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
      await screen.findByText('Nada precisa da sua atenção agora.'),
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
      screen.getByText('Nada precisa da sua atenção agora.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Suas interações com as trilhas aparecerão aqui.'),
    ).toBeInTheDocument()
  })

  it('lista em "Minhas trilhas" as trilhas recebidas, com o progresso', async () => {
    let filtroMinhas: string | null = null
    server.use(
      http.get('*/api/dashboard/colaborador', () =>
        HttpResponse.json(
          criarDashboardColaborador({
            proximosPrazos: [],
            ultimasAtividades: [],
          }),
        ),
      ),
      http.get('*/api/trilhas', ({ request }) => {
        filtroMinhas = new URL(request.url).searchParams.get('minhas')
        return HttpResponse.json(
          criarPaginaTrilhas([
            criarTrilhaResumo({
              id: 'trilha-longa',
              nome: 'Liderança',
              progresso: criarProgressoTrilha({
                status: 'EM_ANDAMENTO',
                percentual: 30,
                prazo: '2026-12-20',
              }),
            }),
          ]),
        )
      }),
    )

    renderizarComProvedores({
      rota: rotaDashboard,
      usuario: criarUsuario({ papel: 'COLABORADOR' }),
    })

    const minhas = await screen.findByRole('region', {
      name: 'Minhas trilhas',
    })
    expect(
      await within(minhas).findByRole('link', { name: /Liderança/ }),
    ).toHaveAttribute('href', '/trilhas/trilha-longa')
    expect(
      within(minhas).getByText(/Em andamento · 30% concluído · prazo em/),
    ).toBeInTheDocument()
    expect(
      within(minhas).getByRole('progressbar', {
        name: 'Progresso em Liderança',
      }),
    ).toHaveAttribute('aria-valuenow', '30')
    expect(filtroMinhas).toBe('true')
  })

  it('interações que não são de trilha não derrubam as últimas atividades', async () => {
    const dashboard = criarDashboardColaborador()
    const usuario = dashboard.ultimasAtividades[0].usuario
    server.use(
      http.get('*/api/dashboard/colaborador', () =>
        HttpResponse.json({
          ...dashboard,
          ultimasAtividades: [
            {
              id: 'a1',
              tipo: 'SENHA_REDEFINIDA',
              detalhes: { origem: 'POST /api/auth/redefinir-senha' },
              usuario,
              criadoEm: '2026-10-19T15:00:00Z',
            },
            {
              id: 'a2',
              tipo: 'ASSISTENTE_CONSULTADO',
              detalhes: { encontrouFontes: true, quantidadeFontes: 1 },
              usuario,
              criadoEm: '2026-10-19T14:45:00Z',
            },
            ...dashboard.ultimasAtividades,
          ],
        }),
      ),
    )

    renderizarComProvedores({
      rota: rotaDashboard,
      usuario: criarUsuario({ papel: 'COLABORADOR' }),
    })

    expect(await screen.findByText(/Você iniciou/)).toBeInTheDocument()
    expect(
      screen.queryByText('A API retornou uma lista de atividades inválida.'),
    ).not.toBeInTheDocument()
  })
})
