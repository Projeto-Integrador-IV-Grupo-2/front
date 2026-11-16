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

  it('destaca a trilha atrasada com o selo e o prazo vencido', async () => {
    server.use(
      http.get('*/api/trilhas', () =>
        HttpResponse.json(
          criarPaginaTrilhas([
            criarTrilhaResumo({
              id: 'trilha-1',
              nome: 'Onboarding Comercial',
              progresso: criarProgressoTrilha({
                status: 'ATRASADA',
                percentual: 50,
                prazo: '2026-09-10',
              }),
            }),
            criarTrilhaResumo({
              id: 'trilha-2',
              nome: 'LGPD',
              progresso: criarProgressoTrilha({ prazo: '2026-12-01' }),
            }),
          ]),
        ),
      ),
    )

    renderizarTrilhas()

    const atrasada = await screen.findByRole('link', {
      name: /Onboarding Comercial/,
    })
    expect(within(atrasada).getByText('Atrasada')).toBeInTheDocument()
    expect(
      within(atrasada).getByText(/Venceu em 10 de setembro de 2026/),
    ).toBeInTheDocument()

    // No prazo, a data aparece sem o destaque de atraso.
    const noPrazo = lista().getByRole('link', { name: /LGPD/ })
    expect(
      within(noPrazo).getByText(/Prazo: 1 de dezembro de 2026/),
    ).toBeInTheDocument()
  })

  it('não oferece o cadastro para quem não é administrador', async () => {
    renderizarTrilhas(colaborador)

    await screen.findByRole('link', { name: /Onboarding/ })
    expect(screen.queryByRole('button', { name: 'Nova trilha' })).toBeNull()
  })

  it('colaborador sem trilhas vê o estado vazio, sem catálogo', async () => {
    server.use(
      http.get('*/api/trilhas', () =>
        HttpResponse.json(criarPaginaTrilhas([])),
      ),
    )

    renderizarTrilhas()

    expect(
      await screen.findByText('Você ainda não tem trilhas'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'As trilhas atribuídas a você aparecem aqui, ordenadas pelo prazo.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ver catálogo' })).toBeNull()
  })

  it('"Minhas trilhas" pede só as do usuário, pelo prazo', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/trilhas', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(criarPaginaTrilhas())
      }),
    )

    renderizarTrilhas()

    await screen.findByRole('link', { name: /Onboarding/ })
    expect(url!.searchParams.get('minhas')).toBe('true')
    expect(url!.searchParams.get('sort')).toBe('prazo')
  })

  it('gestão vê só o catálogo, sem "Minhas trilhas", status pessoal nem progresso', async () => {
    renderizarTrilhas(criarUsuario({ papel: 'ADMIN' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Trilhas' }),
    ).toBeInTheDocument()
    await screen.findByRole('list', { name: 'Trilhas' })
    expect(screen.queryByRole('tab', { name: 'Minhas trilhas' })).toBeNull()
    expect(screen.queryByLabelText('Status')).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('colaborador não tem a aba Catálogo, nem pela URL', async () => {
    const urls: URL[] = []
    server.use(
      http.get('*/api/trilhas', ({ request }) => {
        urls.push(new URL(request.url))
        return HttpResponse.json(criarPaginaTrilhas())
      }),
    )

    // Entrar numa trilha é atribuição da gestão: o catálogo não aparece.
    renderizarComProvedores({
      rota: '/trilhas?aba=catalogo',
      usuario: colaborador,
    })

    await screen.findByRole('link', { name: /Onboarding/ })
    expect(screen.queryByRole('tab', { name: 'Catálogo' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Minhas trilhas' })).toBeNull()
    expect(urls.every((url) => url.searchParams.get('minhas') === 'true')).toBe(
      true,
    )
  })

  it('combina busca, área e status e volta para a primeira página', async () => {
    const urls: URL[] = []
    server.use(
      http.get('*/api/trilhas', ({ request }) => {
        const url = new URL(request.url)
        urls.push(url)
        const pagina = Number(url.searchParams.get('page'))
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
    const usuario = userEvent.setup()

    renderizarTrilhas()

    await screen.findByRole('link', { name: /Trilha 0/ })
    await usuario.click(
      screen.getByRole('button', { name: 'Carregar mais trilhas' }),
    )
    await screen.findByRole('link', { name: /Trilha 1/ })

    const filtros = within(
      screen.getByRole('search', { name: 'Filtros de trilhas' }),
    )
    await waitFor(() =>
      expect(
        filtros.getByRole('option', { name: 'Tecnologia' }),
      ).toBeInTheDocument(),
    )
    await usuario.selectOptions(filtros.getByLabelText('Área'), 'Tecnologia')
    await usuario.selectOptions(filtros.getByLabelText('Status'), 'Atrasada')

    await waitFor(() => {
      const ultima = urls[urls.length - 1].searchParams
      expect(ultima.get('areaId')).toBe('33333333-3333-3333-3333-333333333333')
      expect(ultima.get('status')).toBe('ATRASADA')
      expect(ultima.get('minhas')).toBe('true')
      expect(ultima.get('page')).toBe('0')
    })
    // Só a primeira página do novo filtro fica na tela.
    expect(await screen.findByText('1 de 2 trilhas')).toBeInTheDocument()
  })

  it('busca por nome só quando a pessoa para de digitar', async () => {
    const nomesBuscados: Array<string | null> = []
    server.use(
      http.get('*/api/trilhas', ({ request }) => {
        nomesBuscados.push(new URL(request.url).searchParams.get('nome'))
        return HttpResponse.json(criarPaginaTrilhas())
      }),
    )
    const usuario = userEvent.setup()

    renderizarTrilhas()
    await screen.findByRole('link', { name: /Onboarding/ })

    await usuario.type(screen.getByLabelText('Buscar'), 'onbo')

    await waitFor(() => expect(nomesBuscados).toContain('onbo'))
    // Uma busca ao abrir e uma depois de digitar — nenhuma por tecla.
    expect(nomesBuscados).toEqual([null, 'onbo'])
  })

  it('avisa quando nenhum resultado combina com os filtros', async () => {
    server.use(
      http.get('*/api/trilhas', ({ request }) =>
        HttpResponse.json(
          criarPaginaTrilhas(
            new URL(request.url).searchParams.has('status')
              ? []
              : [criarTrilhaResumo()],
          ),
        ),
      ),
    )
    const usuario = userEvent.setup()

    renderizarTrilhas()
    await screen.findByRole('link', { name: /Onboarding/ })

    await usuario.selectOptions(screen.getByLabelText('Status'), 'Concluída')

    expect(
      await screen.findByText('Nenhuma trilha encontrada'),
    ).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(
      await screen.findByRole('link', { name: /Onboarding/ }),
    ).toBeInTheDocument()
  })

  it('não mostra recomendações para quem não tem área', async () => {
    const urls: URL[] = []
    server.use(
      http.get('*/api/trilhas', ({ request }) => {
        urls.push(new URL(request.url))
        return HttpResponse.json(criarPaginaTrilhas())
      }),
    )

    renderizarComProvedores({
      rota: '/trilhas?aba=catalogo',
      usuario: criarUsuario({ area: null }),
    })

    await screen.findByRole('link', { name: /Onboarding/ })
    expect(
      screen.queryByRole('heading', { name: 'Recomendadas para sua área' }),
    ).toBeNull()
    expect(urls.every((url) => !url.searchParams.has('recomendar'))).toBe(true)
    expect(urls.every((url) => !url.searchParams.has('areaId'))).toBe(true)
  })

  it('não mostra recomendações na aba "Minhas trilhas"', async () => {
    renderizarComProvedores({
      rota: '/trilhas',
      usuario: criarUsuario({ area: { id: 'a', nome: 'Vendas' } }),
    })

    await screen.findByRole('link', { name: /Onboarding/ })
    expect(
      screen.queryByRole('heading', { name: 'Recomendadas para sua área' }),
    ).toBeNull()
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
    await usuario.type(
      within(dialogo).getByLabelText('Descrição'),
      'Trilha do time comercial.',
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
      descricao: 'Trilha do time comercial.',
      areaId: '33333333-3333-3333-3333-333333333333',
      prazoDias: 30,
      objetivos: 'Vender com método.',
    })
    // Trilha nova vai direto para o detalhe: é lá que se montam as etapas e
    // se atribui.
    expect(
      await screen.findByText(
        'Trilha “Excelência em Vendas” criada. Agora adicione as etapas e atribua aos colaboradores.',
      ),
    ).toBeInTheDocument()
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
    expect(
      within(screen.getByRole('dialog')).getByLabelText('Área'),
    ).toHaveValue('')
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
