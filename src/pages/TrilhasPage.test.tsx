import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  criarPaginaTrilhas,
  criarProgressoTrilha,
  criarTrilhaResumo,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

const admin = criarUsuario({ papel: 'ADMIN', nomeCompleto: 'Admin Nexo' })
const colaborador = criarUsuario({ papel: 'COLABORADOR' })

function renderizarTrilhas(usuario = colaborador) {
  return renderizarComProvedores({ rota: '/trilhas', usuario })
}

const lista = () => within(screen.getByRole('list', { name: 'Trilhas' }))

describe('TrilhasPage', () => {
  it('lista as trilhas com área, status e progresso, e leva ao detalhe', async () => {
    server.use(
      http.get('*/api/trilhas', () =>
        HttpResponse.json(
          criarPaginaTrilhas([
            criarTrilhaResumo({
              id: 'trilha-1',
              nome: 'Atendimento ao Cliente',
              objetivos: 'Resolver conflitos no atendimento.',
              progresso: criarProgressoTrilha({
                status: 'EM_ANDAMENTO',
                percentual: 50,
              }),
            }),
            criarTrilhaResumo({ id: 'trilha-2', nome: 'LGPD', area: null }),
          ]),
        ),
      ),
    )

    renderizarTrilhas()

    expect(
      await screen.findByRole('heading', { name: 'Minhas trilhas' }),
    ).toBeInTheDocument()
    const link = await screen.findByRole('link', {
      name: /Atendimento ao Cliente/,
    })
    expect(link).toHaveAttribute('href', '/trilhas/trilha-1')
    expect(within(link).getByText('Em andamento')).toBeInTheDocument()
    expect(within(link).getByText('Tecnologia')).toBeInTheDocument()
    expect(
      within(link).getByRole('progressbar', {
        name: 'Progresso em Atendimento ao Cliente',
      }),
    ).toHaveAttribute('aria-valuenow', '50')

    // Sem progresso na resposta (contrato atual da API): só nome e área.
    const semProgresso = lista().getByRole('link', { name: /LGPD/ })
    expect(within(semProgresso).getByText('Multi-área')).toBeInTheDocument()
    expect(within(semProgresso).queryByRole('progressbar')).toBeNull()
  })

  it('não oferece o cadastro para quem não é administrador', async () => {
    renderizarTrilhas(colaborador)

    await screen.findByRole('link', { name: /Onboarding/ })
    expect(screen.queryByRole('button', { name: 'Nova trilha' })).toBeNull()
  })

  it('mostra o estado vazio quando não há trilhas', async () => {
    server.use(
      http.get('*/api/trilhas', () =>
        HttpResponse.json(criarPaginaTrilhas([])),
      ),
    )

    renderizarTrilhas()

    expect(
      await screen.findByText('Nenhuma trilha disponível no momento'),
    ).toBeInTheDocument()
  })

  it('mostra erro amigável e tenta de novo', async () => {
    let chamadas = 0
    server.use(
      http.get('*/api/trilhas', () => {
        chamadas += 1
        return chamadas === 1
          ? HttpResponse.json({ message: 'boom' }, { status: 500 })
          : HttpResponse.json(criarPaginaTrilhas())
      }),
    )

    renderizarTrilhas()

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(
      'O servidor não conseguiu concluir a operação.',
    )

    await userEvent.click(
      within(alerta).getByRole('button', { name: 'Tentar novamente' }),
    )

    expect(
      await screen.findByRole('link', { name: /Onboarding/ }),
    ).toBeInTheDocument()
  })

  it('carrega a próxima página e mantém as trilhas já exibidas', async () => {
    server.use(
      http.get('*/api/trilhas', ({ request }) => {
        const pagina = Number(new URL(request.url).searchParams.get('page'))
        return HttpResponse.json(
          criarPaginaTrilhas(
            [
              criarTrilhaResumo({
                id: `t-${pagina}`,
                nome: `Trilha ${pagina}`,
              }),
            ],
            { number: pagina, totalElements: 2, totalPages: 2 },
          ),
        )
      }),
    )

    renderizarTrilhas()

    await screen.findByRole('link', { name: /Trilha 0/ })
    expect(screen.getByText('1 de 2 trilhas')).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Carregar mais trilhas' }),
    )

    expect(
      await screen.findByRole('link', { name: /Trilha 1/ }),
    ).toBeInTheDocument()
    expect(lista().getByRole('link', { name: /Trilha 0/ })).toBeInTheDocument()
    expect(screen.getByText('2 de 2 trilhas')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Carregar mais trilhas' }),
    ).toBeNull()
  })

  it('administrador cria uma trilha e vê a listagem atualizada', async () => {
    let corpo: unknown = null
    let criada = false
    server.use(
      http.post('*/api/trilhas', async ({ request }) => {
        corpo = await request.json()
        criada = true
        return HttpResponse.json(
          criarTrilhaResumo({ id: 'nova', nome: 'Excelência em Vendas' }),
          { status: 201 },
        )
      }),
      http.get('*/api/trilhas', () =>
        HttpResponse.json(
          criarPaginaTrilhas(
            criada
              ? [
                  criarTrilhaResumo(),
                  criarTrilhaResumo({
                    id: 'nova',
                    nome: 'Excelência em Vendas',
                  }),
                ]
              : [criarTrilhaResumo()],
          ),
        ),
      ),
    )
    const usuario = userEvent.setup()

    renderizarTrilhas(admin)

    expect(
      await screen.findByRole('heading', { name: 'Trilhas' }),
    ).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Nova trilha' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Nova trilha' })
    const nome = within(dialogo).getByLabelText('Nome da trilha')
    expect(nome).toHaveFocus()

    // Validação local: nome obrigatório, sem ir à API.
    await usuario.click(
      within(dialogo).getByRole('button', { name: 'Criar trilha' }),
    )
    expect(
      within(dialogo).getByText('Informe o nome da trilha.'),
    ).toBeInTheDocument()
    expect(corpo).toBeNull()

    await usuario.type(nome, 'Excelência em Vendas')
    await waitFor(() =>
      expect(
        within(dialogo).getByRole('option', { name: 'Tecnologia' }),
      ).toBeInTheDocument(),
    )
    await usuario.selectOptions(
      within(dialogo).getByLabelText('Área'),
      'Tecnologia',
    )
    await usuario.type(within(dialogo).getByLabelText('Prazo (dias)'), '30')
    await usuario.type(
      within(dialogo).getByLabelText('Objetivo'),
      'Vender com método.',
    )
    await usuario.click(
      within(dialogo).getByRole('button', { name: 'Criar trilha' }),
    )

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(corpo).toEqual({
      nome: 'Excelência em Vendas',
      areaId: '33333333-3333-3333-3333-333333333333',
      prazoDias: 30,
      objetivos: 'Vender com método.',
    })
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(
      'Trilha “Excelência em Vendas” criada.',
    )
    expect(
      await screen.findByRole('link', { name: /Excelência em Vendas/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nova trilha' })).toHaveFocus()
  })

  it('mantém o formulário aberto e mostra o erro da API', async () => {
    server.use(
      http.post('*/api/trilhas', () =>
        HttpResponse.json(
          {
            message: 'Já existe uma trilha com esse nome.',
            fieldErrors: [{ field: 'nome', message: 'nome já utilizado' }],
          },
          { status: 409 },
        ),
      ),
    )
    const usuario = userEvent.setup()

    renderizarTrilhas(admin)
    await usuario.click(
      await screen.findByRole('button', { name: 'Nova trilha' }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Nova trilha' })
    await usuario.type(
      within(dialogo).getByLabelText('Nome da trilha'),
      'Onboarding',
    )
    await usuario.click(
      within(dialogo).getByRole('button', { name: 'Criar trilha' }),
    )

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Já existe uma trilha com esse nome.',
    )
    expect(within(dialogo).getByText('nome já utilizado')).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Nome da trilha')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('segue com o cadastro multi-área quando as áreas não carregam', async () => {
    server.use(
      http.get('*/api/areas', () => new HttpResponse(null, { status: 404 })),
    )
    const usuario = userEvent.setup()

    renderizarTrilhas(admin)
    await usuario.click(
      await screen.findByRole('button', { name: 'Nova trilha' }),
    )

    expect(
      await screen.findByText(/Não foi possível carregar as áreas/),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Área')).toHaveValue('')
  })

  it('fecha o diálogo com Esc e devolve o foco ao botão', async () => {
    const usuario = userEvent.setup()

    renderizarTrilhas(admin)
    await usuario.click(
      await screen.findByRole('button', { name: 'Nova trilha' }),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await usuario.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Nova trilha' })).toHaveFocus()
  })

  it('aparece no menu para qualquer perfil autenticado', async () => {
    renderizarComProvedores({ rota: '/dashboard', usuario: colaborador })

    const menu = await screen.findByRole('navigation')
    expect(within(menu).getByRole('link', { name: /Trilhas/ })).toHaveAttribute(
      'href',
      '/trilhas',
    )
  })
})
