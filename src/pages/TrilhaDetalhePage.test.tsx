import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  criarPagina,
  criarPaginaTrilhas,
  criarPdiDetalhe,
  criarPdiResumo,
  criarProgressoTrilha,
  criarTrilhaDetalhe,
  criarTrilhaResumo,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

const colaborador = criarUsuario({ papel: 'COLABORADOR' })
const ID = '44444444-4444-4444-4444-444444444444'

function renderizarDetalhe(rota = `/trilhas/${ID}`) {
  return renderizarComProvedores({ rota, usuario: colaborador })
}

const emAndamento = () =>
  criarTrilhaDetalhe({
    progresso: criarProgressoTrilha({
      status: 'EM_ANDAMENTO',
      percentual: 50,
      prazo: '2026-10-30',
      atribuidoEm: '2026-09-01T12:00:00Z',
    }),
  })

describe('TrilhaDetalhePage', () => {
  it('mostra dados da trilha, jornada e progresso atual', async () => {
    server.use(
      http.get('*/api/trilhas/:id', () => HttpResponse.json(emAndamento())),
    )

    renderizarDetalhe()

    const titulo = await screen.findByRole('heading', {
      level: 1,
      name: 'Onboarding',
    })
    await waitFor(() => expect(titulo).toHaveFocus())
    expect(screen.getByText('Primeiros passos na empresa.')).toBeInTheDocument()

    const progresso = screen.getByRole('region', { name: 'Progresso geral' })
    expect(within(progresso).getByText('Em andamento')).toBeInTheDocument()
    expect(within(progresso).getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '50',
    )
    expect(
      within(progresso).getByText('Prazo: 30 de outubro de 2026'),
    ).toBeInTheDocument()

    const jornada = screen.getByRole('region', { name: 'Jornada' })
    expect(
      within(jornada).getByText('Iniciada em 1 de setembro de 2026'),
    ).toBeInTheDocument()
    expect(
      within(jornada)
        .getAllByRole('listitem')
        .find((item) => item.getAttribute('aria-current') === 'step'),
    ).toHaveTextContent('Em andamento')

    const sobre = screen.getByRole('region', { name: 'Sobre a trilha' })
    expect(within(sobre).getByText('Tecnologia')).toBeInTheDocument()
    expect(within(sobre).getByText('30 dias')).toBeInTheDocument()

    // O topo mantém o título da seção nas subrotas. O jsdom também conta o
    // <header> da página como banner, então vale o primeiro (a barra do layout).
    expect(screen.getAllByRole('banner')[0]).toHaveTextContent('Trilhas')
  })

  it('inicia a trilha e mostra o que a API devolve depois, não o presumido', async () => {
    let iniciou = false
    let buscas = 0
    server.use(
      http.get('*/api/trilhas/:id', () => {
        buscas += 1
        // A revalidação traz um estado diferente do que o POST respondeu:
        // a tela tem de mostrar este, prova de que buscou de novo.
        return HttpResponse.json(
          iniciou
            ? criarTrilhaDetalhe({
                progresso: criarProgressoTrilha({
                  status: 'ATRASADA',
                  percentual: 50,
                }),
              })
            : criarTrilhaDetalhe(),
        )
      }),
      http.post('*/api/trilhas/:id/progresso', () => {
        iniciou = true
        return HttpResponse.json(
          criarProgressoTrilha({ status: 'EM_ANDAMENTO' }),
        )
      }),
    )
    const usuario = userEvent.setup()

    renderizarDetalhe()
    await usuario.click(
      await screen.findByRole('button', { name: 'Iniciar trilha' }),
    )

    expect(await screen.findByText('Trilha iniciada.')).toBeInTheDocument()
    const progresso = screen.getByRole('region', { name: 'Progresso geral' })
    expect(within(progresso).getByText('Atrasada')).toBeInTheDocument()
    expect(buscas).toBe(2)
    expect(
      screen.getByRole('button', { name: 'Marcar como concluída' }),
    ).toBeEnabled()
  })

  it('conclui com PATCH status CONCLUIDA e oferece retomar', async () => {
    let corpo: unknown = null
    server.use(
      http.get('*/api/trilhas/:id', () =>
        HttpResponse.json(
          corpo
            ? criarTrilhaDetalhe({
                progresso: criarProgressoTrilha({
                  status: 'CONCLUIDA',
                  percentual: 100,
                  concluidoEm: '2026-09-20T15:00:00Z',
                }),
              })
            : emAndamento(),
        ),
      ),
      http.patch('*/api/trilhas/:id/progresso', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(criarProgressoTrilha({ status: 'CONCLUIDA' }))
      }),
    )
    const usuario = userEvent.setup()

    renderizarDetalhe()
    await usuario.click(
      await screen.findByRole('button', { name: 'Marcar como concluída' }),
    )

    expect(
      await screen.findByText('Trilha concluída. Parabéns!'),
    ).toBeInTheDocument()
    expect(corpo).toEqual({ status: 'CONCLUIDA' })
    expect(
      screen.getByText('Concluída em 20 de setembro de 2026'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Retomar trilha' }),
    ).toBeInTheDocument()
  })

  it('mostra o erro da ação sem perder a tela', async () => {
    server.use(
      http.get('*/api/trilhas/:id', () => HttpResponse.json(emAndamento())),
      http.patch('*/api/trilhas/:id/progresso', () =>
        HttpResponse.json({ message: 'Falhou' }, { status: 503 }),
      ),
    )
    const usuario = userEvent.setup()

    renderizarDetalhe()
    await usuario.click(
      await screen.findByRole('button', { name: 'Marcar como concluída' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O servidor não conseguiu concluir a operação.',
    )
    expect(
      within(screen.getByRole('region', { name: 'Progresso geral' })).getByText(
        'Em andamento',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Marcar como concluída' }),
    ).toBeEnabled()
  })

  it('trata trilha inexistente com mensagem e caminho de volta', async () => {
    server.use(
      http.get('*/api/trilhas/:id', () =>
        HttpResponse.json(
          { message: 'Trilha não encontrada: x' },
          { status: 404 },
        ),
      ),
    )

    renderizarDetalhe('/trilhas/x')

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Trilha não encontrada')
    expect(alerta).not.toHaveTextContent('x')
    expect(
      within(alerta).getByRole('link', { name: 'Ver todas as trilhas' }),
    ).toHaveAttribute('href', '/trilhas')
  })

  it('tenta de novo depois de um erro de servidor', async () => {
    let chamadas = 0
    server.use(
      http.get('*/api/trilhas/:id', () => {
        chamadas += 1
        return chamadas === 1
          ? HttpResponse.json({}, { status: 500 })
          : HttpResponse.json(emAndamento())
      }),
    )
    const usuario = userEvent.setup()

    renderizarDetalhe()
    await usuario.click(
      await screen.findByRole('button', { name: 'Tentar novamente' }),
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Onboarding' }),
    ).toBeInTheDocument()
  })

  it('abre a partir do cartão da listagem', async () => {
    server.use(
      http.get('*/api/trilhas', () =>
        HttpResponse.json(
          criarPaginaTrilhas([
            criarTrilhaResumo({ id: ID, nome: 'Onboarding' }),
          ]),
        ),
      ),
    )
    const usuario = userEvent.setup()

    renderizarDetalhe('/trilhas')
    await usuario.click(await screen.findByRole('link', { name: /Onboarding/ }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Onboarding' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Voltar para trilhas' }),
    ).toHaveAttribute('href', '/trilhas')
  })
})

describe('TrilhaDetalhePage — Adicionar ao PDI', () => {
  it('colaborador não vê o botão', async () => {
    renderizarDetalhe()

    await screen.findByRole('heading', { level: 1, name: 'Onboarding' })
    expect(
      screen.queryByRole('button', { name: 'Adicionar ao PDI' }),
    ).not.toBeInTheDocument()
  })

  it('gestor liga a trilha a uma competência do PDI de um colaborador', async () => {
    let caminho = ''
    let corpo: unknown = null
    server.use(
      http.get('*/api/pdis', () =>
        HttpResponse.json(
          criarPagina([
            criarPdiResumo(),
            // PDI cancelado não recebe trilha nova: nem aparece.
            criarPdiResumo({
              id: 'cancelado',
              colaborador: { id: 'u-9', nomeCompleto: 'Diego Reis' },
              status: 'CANCELADO',
            }),
          ]),
        ),
      ),
      http.get('*/api/pdis/:id', () => HttpResponse.json(criarPdiDetalhe())),
      http.post(
        '*/api/pdis/:id/itens/:itemId/acoes',
        async ({ request, params }) => {
          caminho = `${String(params.id)}/${String(params.itemId)}`
          corpo = await request.json()
          return HttpResponse.json({}, { status: 201 })
        },
      ),
    )
    const user = userEvent.setup()

    renderizarComProvedores({
      rota: `/trilhas/${ID}`,
      usuario: criarUsuario({ papel: 'GESTOR' }),
    })

    await user.click(
      await screen.findByRole('button', { name: 'Adicionar ao PDI' }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Adicionar ao PDI' })
    const pdi = within(dialogo).getByLabelText('PDI')
    await waitFor(() =>
      expect(
        within(pdi).getByRole('option', { name: 'Ana Souza — ciclo 2026' }),
      ).toBeInTheDocument(),
    )
    expect(
      within(pdi).queryByRole('option', { name: /Diego Reis/ }),
    ).not.toBeInTheDocument()

    await user.selectOptions(pdi, 'Ana Souza — ciclo 2026')
    const competencia = within(dialogo).getByLabelText('Competência')
    await waitFor(() =>
      expect(
        within(competencia).getByRole('option', { name: 'Comunicação' }),
      ).toBeInTheDocument(),
    )
    await user.selectOptions(competencia, 'Comunicação')
    await user.type(within(dialogo).getByLabelText('Prazo'), '2026-11-30')
    await user.click(
      within(dialogo).getByRole('button', { name: 'Adicionar ao PDI' }),
    )

    expect(
      await screen.findByText('Trilha adicionada ao PDI de Ana Souza.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(caminho).toBe(
      '99999999-9999-9999-9999-999999999999/88888888-8888-8888-8888-888888888888',
    )
    expect(corpo).toEqual({ tipo: 'TRILHA', trilhaId: ID, prazo: '2026-11-30' })
  })

  it('mostra o erro da API sem fechar o diálogo', async () => {
    server.use(
      http.post('*/api/pdis/:id/itens/:itemId/acoes', () =>
        HttpResponse.json(
          { message: 'Trilha inativa não pode ser ligada ao PDI: Onboarding' },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()

    renderizarComProvedores({
      rota: `/trilhas/${ID}`,
      usuario: criarUsuario({ papel: 'ADMIN' }),
    })

    await user.click(
      await screen.findByRole('button', { name: 'Adicionar ao PDI' }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Adicionar ao PDI' })
    const pdi = within(dialogo).getByLabelText('PDI')
    await waitFor(() =>
      expect(within(pdi).getAllByRole('option')).toHaveLength(2),
    )
    await user.selectOptions(pdi, 'Ana Souza — ciclo 2026')
    const competencia = within(dialogo).getByLabelText('Competência')
    await waitFor(() =>
      expect(
        within(competencia).getByRole('option', { name: 'Comunicação' }),
      ).toBeInTheDocument(),
    )
    await user.selectOptions(competencia, 'Comunicação')
    await user.type(within(dialogo).getByLabelText('Prazo'), '2026-11-30')
    await user.click(
      within(dialogo).getByRole('button', { name: 'Adicionar ao PDI' }),
    )

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Trilha inativa não pode ser ligada ao PDI: Onboarding',
    )
  })
})
