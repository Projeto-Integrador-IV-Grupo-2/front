import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  criarAtribuicao,
  criarPagina,
  criarPaginaTrilhas,
  criarPaginaUsuarios,
  criarProgressoTrilha,
  criarResultadoAtribuicao,
  criarTrilhaDetalhe,
  criarTrilhaResumo,
  criarUsuario,
  criarUsuarioGestao,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

const colaborador = criarUsuario({ papel: 'COLABORADOR' })
const admin = criarUsuario({ papel: 'ADMIN' })
const gestor = criarUsuario({ papel: 'GESTOR' })
const ID = '44444444-4444-4444-4444-444444444444'

function renderizarDetalhe(rota = `/trilhas/${ID}`) {
  return renderizarComProvedores({ rota, usuario: colaborador })
}

function renderizarComo(usuario: ReturnType<typeof criarUsuario>) {
  return renderizarComProvedores({ rota: `/trilhas/${ID}`, usuario })
}

/** Colaboradores do diálogo de atribuição, com nomes distinguíveis. */
function responderColaboradores() {
  server.use(
    http.get('*/api/usuarios', () =>
      HttpResponse.json(
        criarPaginaUsuarios([
          criarUsuarioGestao({ id: 'u-1', nomeCompleto: 'Ana Souza' }),
          criarUsuarioGestao({
            id: 'u-2',
            nomeCompleto: 'Bruno Castro',
            email: 'bruno@nexo.com',
          }),
        ]),
      ),
    ),
  )
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

  it('mostra o selo e o prazo vencido em destaque quando a trilha atrasa', async () => {
    server.use(
      http.get('*/api/trilhas/:id', () =>
        HttpResponse.json(
          criarTrilhaDetalhe({
            progresso: criarProgressoTrilha({
              status: 'ATRASADA',
              prazo: '2026-09-10',
            }),
          }),
        ),
      ),
    )

    renderizarDetalhe()

    expect(await screen.findAllByText('Atrasada')).not.toHaveLength(0)
    const progresso = screen.getByRole('region', { name: 'Progresso geral' })
    expect(
      within(progresso).getByText(/Prazo vencido em 10 de setembro de 2026/),
    ).toBeInTheDocument()
  })

  it('não oferece editar, inativar nem atribuir ao colaborador', async () => {
    renderizarDetalhe()

    await screen.findByRole('heading', { level: 1, name: 'Onboarding' })
    expect(
      screen.queryByRole('button', { name: 'Editar trilha' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Inativar' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Atribuir colaboradores' }),
    ).not.toBeInTheDocument()
  })

  it('gestor atribui, mas não edita nem inativa', async () => {
    renderizarComo(gestor)

    await screen.findByRole('heading', { level: 1, name: 'Onboarding' })
    expect(
      screen.getByRole('button', { name: 'Atribuir colaboradores' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Editar trilha' }),
    ).not.toBeInTheDocument()
  })

  it('administrador edita a trilha e o detalhe se atualiza sem recarregar', async () => {
    let corpo: unknown = null
    server.use(
      http.put('*/api/trilhas/:id', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(
          criarTrilhaDetalhe({
            nome: 'Onboarding 2026',
            descricao: 'Primeira semana na empresa.',
          }),
        )
      }),
    )
    const usuario = userEvent.setup()

    renderizarComo(admin)
    await usuario.click(
      await screen.findByRole('button', { name: 'Editar trilha' }),
    )

    const dialogo = await screen.findByRole('dialog', { name: 'Editar trilha' })
    // O formulário abre preenchido com a trilha em edição.
    expect(within(dialogo).getByLabelText('Nome da trilha')).toHaveValue(
      'Onboarding',
    )
    expect(within(dialogo).getByLabelText('Descrição')).toHaveValue(
      'Primeiros passos na empresa.',
    )

    await usuario.clear(within(dialogo).getByLabelText('Nome da trilha'))
    await usuario.type(
      within(dialogo).getByLabelText('Nome da trilha'),
      'Onboarding 2026',
    )
    await usuario.clear(within(dialogo).getByLabelText('Descrição'))
    await usuario.type(
      within(dialogo).getByLabelText('Descrição'),
      'Primeira semana na empresa.',
    )
    await usuario.click(
      within(dialogo).getByRole('button', { name: 'Salvar alterações' }),
    )

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(corpo).toMatchObject({
      nome: 'Onboarding 2026',
      descricao: 'Primeira semana na empresa.',
    })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Onboarding 2026' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Primeira semana na empresa.')).toBeInTheDocument()
    expect(screen.getByText('Trilha atualizada.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar trilha' })).toHaveFocus()
  })

  it('mostra o erro por campo quando a API recusa a edição', async () => {
    server.use(
      http.put('*/api/trilhas/:id', () =>
        HttpResponse.json(
          {
            message: 'Dados inválidos.',
            fieldErrors: [
              { field: 'nome', message: 'Já existe uma trilha com esse nome.' },
            ],
          },
          { status: 409 },
        ),
      ),
    )
    const usuario = userEvent.setup()

    renderizarComo(admin)
    await usuario.click(
      await screen.findByRole('button', { name: 'Editar trilha' }),
    )
    const dialogo = await screen.findByRole('dialog', { name: 'Editar trilha' })
    await usuario.click(
      within(dialogo).getByRole('button', { name: 'Salvar alterações' }),
    )

    expect(
      await within(dialogo).findByText('Já existe uma trilha com esse nome.'),
    ).toBeInTheDocument()
    // O diálogo continua aberto: dá para corrigir sem perder o que foi digitado.
    expect(screen.getByRole('dialog', { name: 'Editar trilha' })).toBeVisible()
  })

  it('inativar pede confirmação antes de enviar', async () => {
    let chamou = false
    server.use(
      http.patch('*/api/trilhas/:id/inativar', () => {
        chamou = true
        return HttpResponse.json(criarTrilhaDetalhe({ ativo: false }))
      }),
    )
    const usuario = userEvent.setup()

    renderizarComo(admin)
    await usuario.click(await screen.findByRole('button', { name: 'Inativar' }))

    const confirmacao = await screen.findByRole('alertdialog', {
      name: 'Inativar trilha',
    })
    expect(chamou).toBe(false)

    // Desistir não envia nada.
    await usuario.click(
      within(confirmacao).getByRole('button', { name: 'Cancelar' }),
    )
    expect(chamou).toBe(false)

    await usuario.click(screen.getByRole('button', { name: 'Inativar' }))
    await usuario.click(
      within(
        await screen.findByRole('alertdialog', { name: 'Inativar trilha' }),
      ).getByRole('button', { name: 'Inativar' }),
    )

    await waitFor(() => expect(chamou).toBe(true))
    expect(await screen.findByText('Trilha inativada.')).toBeInTheDocument()
    // Inativa: sobra reativar, e a atribuição sai de cena.
    expect(screen.getByRole('button', { name: 'Reativar' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Atribuir colaboradores' }),
    ).not.toBeInTheDocument()
  })

  it('atribui a colaboradores e diz quantos receberam e quantos foram ignorados', async () => {
    let corpo: unknown = null
    responderColaboradores()
    server.use(
      http.post('*/api/trilhas/:id/atribuicoes', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(
          criarResultadoAtribuicao({
            atribuidos: 1,
            ignorados: 1,
          }),
        )
      }),
    )
    const usuario = userEvent.setup()

    renderizarComo(admin)
    await usuario.click(
      await screen.findByRole('button', { name: 'Atribuir colaboradores' }),
    )

    const dialogo = await screen.findByRole('dialog', {
      name: 'Atribuir trilha',
    })

    // Sem ninguém selecionado, a validação local segura o envio.
    await usuario.click(
      within(dialogo).getByRole('button', { name: 'Atribuir trilha' }),
    )
    expect(
      within(dialogo).getByText('Selecione ao menos um colaborador.'),
    ).toBeInTheDocument()
    expect(corpo).toBeNull()

    await usuario.click(
      await within(dialogo).findByRole('checkbox', { name: /Ana Souza/ }),
    )
    await usuario.click(
      within(dialogo).getByRole('button', { name: 'Atribuir trilha' }),
    )

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(corpo).toEqual({ usuarioIds: ['u-1'], prazo: null })
    expect(
      await screen.findByText(
        '1 colaborador recebeu a trilha. 1 já tinha e foi ignorado.',
      ),
    ).toBeInTheDocument()
  })

  it('atribui a uma área inteira com prazo', async () => {
    let corpo: unknown = null
    responderColaboradores()
    server.use(
      http.get('*/api/areas', () =>
        HttpResponse.json(
          criarPagina([{ id: 'area-1', nome: 'Comercial' }], { size: 100 }),
        ),
      ),
      http.post('*/api/trilhas/:id/atribuicoes', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(criarResultadoAtribuicao({ atribuidos: 8 }))
      }),
    )
    const usuario = userEvent.setup()

    renderizarComo(admin)
    await usuario.click(
      await screen.findByRole('button', { name: 'Atribuir colaboradores' }),
    )
    const dialogo = await screen.findByRole('dialog', {
      name: 'Atribuir trilha',
    })

    await usuario.click(
      within(dialogo).getByRole('radio', { name: 'Uma área inteira' }),
    )
    await waitFor(() =>
      expect(
        within(dialogo).getByRole('option', { name: 'Comercial' }),
      ).toBeInTheDocument(),
    )
    await usuario.selectOptions(
      within(dialogo).getByLabelText('Área'),
      'area-1',
    )
    await usuario.type(within(dialogo).getByLabelText('Prazo'), '2099-12-31')
    await usuario.click(
      within(dialogo).getByRole('button', { name: 'Atribuir trilha' }),
    )

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(corpo).toEqual({ areaId: 'area-1', prazo: '2099-12-31' })
    expect(
      await screen.findByText('8 colaboradores receberam a trilha.'),
    ).toBeInTheDocument()
  })

  it('403 na atribuição vira mensagem no diálogo, que continua aberto', async () => {
    responderColaboradores()
    server.use(
      http.post(
        '*/api/trilhas/:id/atribuicoes',
        () => new HttpResponse(null, { status: 403 }),
      ),
    )
    const usuario = userEvent.setup()

    renderizarComo(admin)
    await usuario.click(
      await screen.findByRole('button', { name: 'Atribuir colaboradores' }),
    )
    const dialogo = await screen.findByRole('dialog', {
      name: 'Atribuir trilha',
    })
    await usuario.click(
      await within(dialogo).findByRole('checkbox', { name: /Ana Souza/ }),
    )
    await usuario.click(
      within(dialogo).getByRole('button', { name: 'Atribuir trilha' }),
    )

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Você não tem permissão para esta operação.',
    )
    expect(
      screen.getByRole('dialog', { name: 'Atribuir trilha' }),
    ).toBeVisible()
  })

  it('sem a lista de colaboradores, sobra a atribuição por área', async () => {
    server.use(
      http.get('*/api/usuarios', () => new HttpResponse(null, { status: 403 })),
    )
    const usuario = userEvent.setup()

    renderizarComo(gestor)
    await usuario.click(
      await screen.findByRole('button', { name: 'Atribuir colaboradores' }),
    )
    const dialogo = await screen.findByRole('dialog', {
      name: 'Atribuir trilha',
    })

    expect(
      await within(dialogo).findByText(
        /Não foi possível carregar os colaboradores/,
      ),
    ).toBeInTheDocument()
    expect(
      within(dialogo).getByRole('radio', { name: 'Colaboradores' }),
    ).toBeDisabled()
    expect(
      within(dialogo).getByRole('radio', { name: 'Uma área inteira' }),
    ).toBeChecked()
  })

  it('lista quem recebeu a trilha, com o atraso em destaque', async () => {
    server.use(
      http.get('*/api/atribuicoes', () =>
        HttpResponse.json(
          criarPagina(
            [
              criarAtribuicao({
                id: 'at-1',
                colaborador: {
                  id: 'u-1',
                  nomeCompleto: 'Ana Souza',
                  email: 'ana@nexo.com',
                },
                status: 'EM_ANDAMENTO',
                percentual: 50,
                prazo: '2026-12-01',
              }),
              criarAtribuicao({
                id: 'at-2',
                colaborador: {
                  id: 'u-2',
                  nomeCompleto: 'Bruno Castro',
                  email: 'bruno@nexo.com',
                },
                status: 'ATRASADA',
                percentual: 20,
                prazo: '2026-09-10',
              }),
            ],
            { totalElements: 2 },
          ),
        ),
      ),
    )

    renderizarComo(admin)

    const painel = await screen.findByRole('region', {
      name: 'Colaboradores atribuídos',
    })
    expect(await within(painel).findByText('Ana Souza')).toBeInTheDocument()
    expect(within(painel).getByText('prazo 01/12/2026')).toBeInTheDocument()
    expect(within(painel).getByText('venceu em 10/09/2026')).toBeInTheDocument()
    expect(within(painel).getByText('Atrasada')).toBeInTheDocument()
    expect(
      within(painel).getByRole('progressbar', {
        name: 'Progresso de Bruno Castro',
      }),
    ).toHaveAttribute('aria-valuenow', '20')
  })

  it('pede ao acompanhamento só as atribuições desta trilha', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/atribuicoes', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(criarPagina([criarAtribuicao()]))
      }),
    )

    renderizarComo(admin)
    await screen.findByRole('region', { name: 'Colaboradores atribuídos' })

    await waitFor(() => expect(url).not.toBeNull())
    expect(url!.searchParams.get('trilhaId')).toBe(ID)
  })

  it('avisa quando ninguém recebeu a trilha ainda', async () => {
    server.use(
      http.get('*/api/atribuicoes', () => HttpResponse.json(criarPagina([]))),
    )

    renderizarComo(admin)

    const painel = await screen.findByRole('region', {
      name: 'Colaboradores atribuídos',
    })
    expect(
      await within(painel).findByText(/Ninguém recebeu esta trilha ainda/),
    ).toBeInTheDocument()
  })

  it('o painel se refaz depois de atribuir', async () => {
    let buscas = 0
    responderColaboradores()
    server.use(
      http.get('*/api/atribuicoes', () => {
        buscas += 1
        return HttpResponse.json(
          criarPagina(buscas === 1 ? [] : [criarAtribuicao()]),
        )
      }),
      http.post('*/api/trilhas/:id/atribuicoes', () =>
        HttpResponse.json(criarResultadoAtribuicao()),
      ),
    )
    const usuario = userEvent.setup()

    renderizarComo(admin)
    const painel = await screen.findByRole('region', {
      name: 'Colaboradores atribuídos',
    })
    await within(painel).findByText(/Ninguém recebeu esta trilha ainda/)

    await usuario.click(
      screen.getByRole('button', { name: 'Atribuir colaboradores' }),
    )
    const dialogo = await screen.findByRole('dialog', {
      name: 'Atribuir trilha',
    })
    await usuario.click(
      await within(dialogo).findByRole('checkbox', { name: /Ana Souza/ }),
    )
    await usuario.click(
      within(dialogo).getByRole('button', { name: 'Atribuir trilha' }),
    )

    expect(await within(painel).findByText('Ana Souza')).toBeInTheDocument()
    expect(buscas).toBe(2)
  })

  it('colaborador não vê o painel de atribuídos', async () => {
    renderizarDetalhe()

    await screen.findByRole('heading', { level: 1, name: 'Onboarding' })
    expect(
      screen.queryByRole('region', { name: 'Colaboradores atribuídos' }),
    ).not.toBeInTheDocument()
  })

  it('erro no painel não derruba a tela e oferece tentar de novo', async () => {
    let tentativas = 0
    server.use(
      http.get('*/api/atribuicoes', () => {
        tentativas += 1
        if (tentativas === 1) {
          return HttpResponse.json(
            { message: 'Falha ao carregar o acompanhamento.' },
            { status: 500 },
          )
        }
        return HttpResponse.json(criarPagina([criarAtribuicao()]))
      }),
    )
    const usuario = userEvent.setup()

    renderizarComo(admin)
    const painel = await screen.findByRole('region', {
      name: 'Colaboradores atribuídos',
    })
    expect(await within(painel).findByRole('alert')).toBeInTheDocument()
    // O resto do detalhe continua lá.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Onboarding' }),
    ).toBeInTheDocument()

    await usuario.click(
      within(painel).getByRole('button', { name: 'Tentar novamente' }),
    )
    expect(await within(painel).findByText('Ana Souza')).toBeInTheDocument()
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
