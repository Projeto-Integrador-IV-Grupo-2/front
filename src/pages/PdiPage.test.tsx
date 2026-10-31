import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  criarPagina,
  criarPdiAcao,
  criarPdiDetalhe,
  criarPdiItem,
  criarPdiResumo,
  criarProgressoTrilha,
  criarTrilhaDetalhe,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

const colaborador = criarUsuario({ papel: 'COLABORADOR' })
const gestor = criarUsuario({
  id: '00000000-0000-0000-0000-000000000002',
  nomeCompleto: 'Bruno Lima',
  papel: 'GESTOR',
})
const admin = criarUsuario({ papel: 'ADMIN' })

describe('PdiPage — Meu PDI', () => {
  it('mostra competências, níveis e a trilha ligada com status, prazo e percentual', async () => {
    server.use(
      http.get('*/api/pdis/meu', () =>
        HttpResponse.json(
          criarPdiDetalhe({
            percentual: 0,
            itens: [
              criarPdiItem({
                acoes: [
                  criarPdiAcao({
                    progressoTrilha: criarProgressoTrilha({
                      status: 'EM_ANDAMENTO',
                      percentual: 50,
                      prazo: '2026-11-30',
                    }),
                  }),
                ],
              }),
            ],
          }),
        ),
      ),
    )

    renderizarComProvedores({ rota: '/trilhas/pdi', usuario: colaborador })

    const competencia = await screen.findByRole('region', {
      name: 'Comunicação',
    })
    expect(competencia).toHaveTextContent('Nível atual 2 → alvo 4')
    expect(within(competencia).getByText('Comportamental')).toBeInTheDocument()
    expect(
      within(competencia).getByText('Apresentar com mais segurança.'),
    ).toBeInTheDocument()
    expect(
      within(competencia).getByRole('link', { name: 'Onboarding' }),
    ).toHaveAttribute('href', '/trilhas/44444444-4444-4444-4444-444444444444')
    expect(within(competencia).getByText('Em andamento')).toBeInTheDocument()
    expect(
      within(competencia).getByText('Prazo: 30 de novembro de 2026'),
    ).toBeInTheDocument()
    expect(
      within(competencia).getByRole('progressbar', {
        name: 'Progresso em Onboarding',
      }),
    ).toHaveAttribute('aria-valuenow', '50')

    expect(
      screen.getByRole('progressbar', { name: 'Progresso do PDI 2026' }),
    ).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument()
  })

  it('colaborador não vê a aba "PDIs da equipe", nem pela URL', async () => {
    renderizarComProvedores({
      rota: '/trilhas/pdi?aba=equipe',
      usuario: colaborador,
    })

    expect(
      await screen.findByRole('region', { name: 'Comunicação' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByText('PDIs da equipe')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Novo PDI' }),
    ).not.toBeInTheDocument()
  })

  it('sem PDI ativo mostra o estado vazio', async () => {
    server.use(
      http.get('*/api/pdis/meu', () =>
        HttpResponse.json(
          { message: 'Você não tem PDI ativo' },
          { status: 404 },
        ),
      ),
    )

    renderizarComProvedores({ rota: '/trilhas/pdi', usuario: colaborador })

    expect(
      await screen.findByText('Você ainda não tem um PDI ativo'),
    ).toBeInTheDocument()
  })

  it('falha ao carregar permite tentar de novo', async () => {
    let tentativas = 0
    server.use(
      http.get('*/api/pdis/meu', () => {
        tentativas += 1
        return tentativas === 1
          ? HttpResponse.json({}, { status: 500 })
          : HttpResponse.json(criarPdiDetalhe())
      }),
    )
    const user = userEvent.setup()

    renderizarComProvedores({ rota: '/trilhas/pdi', usuario: colaborador })

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('O servidor não conseguiu concluir')
    await user.click(
      within(alerta).getByRole('button', { name: 'Tentar novamente' }),
    )
    expect(
      await screen.findByRole('region', { name: 'Comunicação' }),
    ).toBeInTheDocument()
  })

  it('o PDI é acessado por Trilhas, sem item próprio no menu', async () => {
    const user = userEvent.setup()
    renderizarComProvedores({ rota: '/trilhas', usuario: colaborador })

    const navegacao = await screen.findByRole('navigation')
    expect(
      within(navegacao).queryByRole('link', { name: /PDI/ }),
    ).not.toBeInTheDocument()

    await user.click(await screen.findByRole('link', { name: 'Meu PDI' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'PDI' }),
    ).toBeInTheDocument()
    // O topo continua com o título da seção.
    expect(screen.getAllByRole('banner')[0]).toHaveTextContent('Trilhas')
  })

  it('concluir a trilha ligada atualiza o percentual ao voltar para a aba', async () => {
    let concluida = false
    const progresso = () =>
      criarProgressoTrilha({
        status: concluida ? 'CONCLUIDA' : 'EM_ANDAMENTO',
        percentual: concluida ? 100 : 50,
      })
    server.use(
      http.get('*/api/pdis/meu', () =>
        HttpResponse.json(
          criarPdiDetalhe({
            percentual: concluida ? 100 : 0,
            acoesConcluidas: concluida ? 1 : 0,
            itens: [
              criarPdiItem({
                acoes: [
                  criarPdiAcao({
                    status: concluida ? 'CONCLUIDA' : 'PENDENTE',
                    progressoTrilha: progresso(),
                  }),
                ],
              }),
            ],
          }),
        ),
      ),
      http.get('*/api/trilhas/:id', () =>
        HttpResponse.json(criarTrilhaDetalhe({ progresso: progresso() })),
      ),
      http.patch('*/api/trilhas/:id/progresso', () => {
        concluida = true
        return HttpResponse.json(progresso())
      }),
    )
    const user = userEvent.setup()

    renderizarComProvedores({ rota: '/trilhas/pdi', usuario: colaborador })

    const barraPdi = await screen.findByRole('progressbar', {
      name: 'Progresso do PDI 2026',
    })
    expect(barraPdi).toHaveAttribute('aria-valuenow', '0')

    // Clicar na trilha abre o detalhe dela.
    await user.click(screen.getByRole('link', { name: 'Onboarding' }))
    await user.click(
      await screen.findByRole('button', { name: 'Marcar como concluída' }),
    )
    await screen.findByText('Trilha concluída. Parabéns!')

    await user.click(screen.getByRole('link', { name: 'Voltar para trilhas' }))
    await user.click(await screen.findByRole('link', { name: 'Meu PDI' }))

    await waitFor(() =>
      expect(
        screen.getByRole('progressbar', { name: 'Progresso do PDI 2026' }),
      ).toHaveAttribute('aria-valuenow', '100'),
    )
    expect(screen.getByText('1 de 1 ação concluída')).toBeInTheDocument()
  })
})

describe('PdiPage — PDIs da equipe', () => {
  it('gestor vê a lista com colaborador, ciclo, status e percentual', async () => {
    server.use(
      http.get('*/api/pdis', () =>
        HttpResponse.json(
          criarPagina([
            criarPdiResumo({ percentual: 40 }),
            criarPdiResumo({
              id: 'pdi-2',
              colaborador: { id: 'u-3', nomeCompleto: 'Carla Dias' },
              ciclo: '2025',
              status: 'CONCLUIDO',
              percentual: 100,
            }),
          ]),
        ),
      ),
    )
    renderizarComProvedores({ rota: '/trilhas/pdi', usuario: gestor })

    // Gestão não tem "Meu PDI": a tela já abre nos PDIs da equipe.
    expect(screen.queryByRole('tab', { name: 'Meu PDI' })).toBeNull()
    const lista = await screen.findByRole('list', { name: 'PDIs da equipe' })
    const linhas = within(lista).getAllByRole('listitem')
    expect(linhas).toHaveLength(2)
    expect(linhas[0]).toHaveTextContent('Ana Souza')
    expect(linhas[0]).toHaveTextContent('Ciclo 2026')
    expect(linhas[0]).toHaveTextContent('Ativo')
    expect(within(linhas[0]).getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '40',
    )
    expect(linhas[1]).toHaveTextContent('Carla Dias')
    expect(linhas[1]).toHaveTextContent('Concluído')
    expect(
      within(linhas[0]).getByRole('link', { name: 'Ana Souza' }),
    ).toHaveAttribute(
      'href',
      '/trilhas/pdi/99999999-9999-9999-9999-999999999999',
    )
  })

  it('admin cria um PDI e cai no editor', async () => {
    let corpo: unknown = null
    // O handler padrão de GET /api/pdis/:id já devolve o PDI da Ana para o editor.
    server.use(
      http.post('*/api/pdis', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(criarPdiDetalhe({ id: 'novo', itens: [] }), {
          status: 201,
        })
      }),
    )
    const user = userEvent.setup()

    renderizarComProvedores({ rota: '/trilhas/pdi?aba=equipe', usuario: admin })

    await user.click(await screen.findByRole('button', { name: 'Novo PDI' }))
    const dialogo = screen.getByRole('dialog', { name: 'Novo PDI' })
    const colaboradorSelect = within(dialogo).getByLabelText('Colaborador')
    await waitFor(() =>
      expect(
        within(colaboradorSelect).getByRole('option', { name: /Ana Souza/ }),
      ).toBeInTheDocument(),
    )
    await user.selectOptions(colaboradorSelect, 'Ana Souza (ana@nexo.com)')
    const ciclo = within(dialogo).getByLabelText('Ciclo')
    await user.clear(ciclo)
    await user.type(ciclo, '2026')
    await user.type(within(dialogo).getByLabelText('Início'), '2026-01-01')
    await user.type(within(dialogo).getByLabelText('Fim'), '2026-12-31')
    await user.click(within(dialogo).getByRole('button', { name: 'Criar PDI' }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'PDI de Ana Souza',
      }),
    ).toBeInTheDocument()
    expect(corpo).toEqual({
      colaboradorId: '00000000-0000-0000-0000-000000000001',
      ciclo: '2026',
      inicio: '2026-01-01',
      fim: '2026-12-31',
    })
  })

  it('PDI repetido no ciclo mostra a mensagem da API', async () => {
    server.use(
      http.post('*/api/pdis', () =>
        HttpResponse.json(
          { message: 'Ana Souza já tem um PDI no ciclo 2026' },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()

    renderizarComProvedores({
      rota: '/trilhas/pdi?aba=equipe',
      usuario: gestor,
    })

    await user.click(await screen.findByRole('button', { name: 'Novo PDI' }))
    const dialogo = screen.getByRole('dialog', { name: 'Novo PDI' })
    const colaboradorSelect = within(dialogo).getByLabelText('Colaborador')
    await waitFor(() =>
      expect(
        within(colaboradorSelect).getByRole('option', { name: /Ana Souza/ }),
      ).toBeInTheDocument(),
    )
    await user.selectOptions(colaboradorSelect, 'Ana Souza (ana@nexo.com)')
    await user.type(within(dialogo).getByLabelText('Início'), '2026-01-01')
    await user.type(within(dialogo).getByLabelText('Fim'), '2026-12-31')
    await user.click(within(dialogo).getByRole('button', { name: 'Criar PDI' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Ana Souza já tem um PDI no ciclo 2026',
    )
  })

  it('valida os campos antes de enviar', async () => {
    const user = userEvent.setup()

    renderizarComProvedores({
      rota: '/trilhas/pdi?aba=equipe',
      usuario: gestor,
    })

    await user.click(await screen.findByRole('button', { name: 'Novo PDI' }))
    const dialogo = screen.getByRole('dialog', { name: 'Novo PDI' })
    await user.type(within(dialogo).getByLabelText('Início'), '2026-12-31')
    await user.type(within(dialogo).getByLabelText('Fim'), '2026-01-01')
    await user.click(within(dialogo).getByRole('button', { name: 'Criar PDI' }))

    expect(
      within(dialogo).getByText('Escolha o colaborador.'),
    ).toBeInTheDocument()
    expect(
      within(dialogo).getByText('O fim não pode ser antes do início.'),
    ).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Fim')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })
})
