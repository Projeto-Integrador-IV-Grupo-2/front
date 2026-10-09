import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  criarAtribuicao,
  criarColaboradorAcompanhamento,
  criarPagina,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'
import type { User } from '../types/user.ts'

const gestor = criarUsuario({ papel: 'GESTOR', nomeCompleto: 'Gil Gestor' })
const admin = criarUsuario({ papel: 'ADMIN', nomeCompleto: 'Admin Nexo' })
const colaborador = criarUsuario({ papel: 'COLABORADOR' })

function renderizar(usuario: User = gestor) {
  return renderizarComProvedores({ rota: '/acompanhamento', usuario })
}

const tabela = () =>
  screen.findByRole('table', { name: 'Andamento das trilhas por colaborador' })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AcompanhamentoPage', () => {
  it('lista colaborador, trilha, status, prazo e percentual', async () => {
    server.use(
      http.get('*/api/atribuicoes', () =>
        HttpResponse.json(
          criarPagina([
            criarAtribuicao({
              id: 'a-1',
              colaborador: {
                id: 'u-1',
                nomeCompleto: 'Bruno Lima',
                email: 'bruno@nexo.com',
              },
              trilha: { id: 't-1', nome: 'LGPD' },
              status: 'EM_ANDAMENTO',
              percentual: 50,
              prazo: '2026-11-15',
            }),
          ]),
        ),
      ),
    )

    renderizar()

    const linhas = within(await tabela()).getAllByRole('row')
    const linha = within(linhas[1])
    expect(linha.getByText('Bruno Lima')).toBeInTheDocument()
    expect(linha.getByText('bruno@nexo.com')).toBeInTheDocument()
    expect(linha.getByText('Tecnologia')).toBeInTheDocument()
    expect(linha.getByText('LGPD')).toBeInTheDocument()
    expect(linha.getByText('Em andamento')).toBeInTheDocument()
    expect(linha.getByText('15/11/2026')).toBeInTheDocument()
    expect(
      linha.getByRole('progressbar', {
        name: 'Progresso de Bruno Lima em LGPD',
      }),
    ).toHaveAttribute('aria-valuenow', '50')
  })

  it('destaca as trilhas atrasadas', async () => {
    server.use(
      http.get('*/api/atribuicoes', () =>
        HttpResponse.json(
          criarPagina([
            criarAtribuicao({ id: 'ok', status: 'EM_ANDAMENTO' }),
            criarAtribuicao({
              id: 'atrasada',
              trilha: { id: 't-2', nome: 'Compliance' },
              status: 'ATRASADA',
              prazo: '2026-09-01',
            }),
          ]),
        ),
      ),
    )

    renderizar()

    const [, emDia, atrasada] = within(await tabela()).getAllByRole('row')
    expect(atrasada.className).toMatch(/atrasada/)
    expect(within(atrasada).getByText('Atrasada')).toBeInTheDocument()
    expect(emDia.className).not.toMatch(/atrasada/)
  })

  it('mostra o estado vazio', async () => {
    server.use(
      http.get('*/api/atribuicoes', () => HttpResponse.json(criarPagina([]))),
    )

    renderizar()

    expect(
      await screen.findByText(
        'Nenhum colaborador iniciou ou recebeu trilhas ainda.',
      ),
    ).toBeInTheDocument()
  })

  it('mostra erro amigável e tenta de novo', async () => {
    let chamadas = 0
    server.use(
      http.get('*/api/atribuicoes', () => {
        chamadas += 1
        return chamadas === 1
          ? HttpResponse.json({ message: 'boom' }, { status: 500 })
          : HttpResponse.json(criarPagina([criarAtribuicao()]))
      }),
    )

    renderizar()

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(
      'O servidor não conseguiu concluir a operação.',
    )
    await userEvent.click(
      within(alerta).getByRole('button', { name: 'Tentar novamente' }),
    )
    expect(await tabela()).toBeInTheDocument()
  })

  it('mostra a mensagem de permissão quando a API responde 403', async () => {
    server.use(
      http.get(
        '*/api/atribuicoes',
        () => new HttpResponse(null, { status: 403 }),
      ),
    )

    renderizar(admin)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Você não tem permissão para acompanhar as trilhas da equipe.',
    )
  })

  it('combina os filtros e volta para a primeira página', async () => {
    const urls: URL[] = []
    server.use(
      http.get('*/api/atribuicoes', ({ request }) => {
        const url = new URL(request.url)
        urls.push(url)
        const pagina = Number(url.searchParams.get('page'))
        return HttpResponse.json(
          criarPagina(
            [
              criarAtribuicao({
                id: `a-${pagina}`,
                colaborador: {
                  id: `u-${pagina}`,
                  nomeCompleto: `Pessoa ${pagina}`,
                  email: `p${pagina}@nexo.com`,
                },
              }),
            ],
            { number: pagina, totalElements: 40, totalPages: 2 },
          ),
        )
      }),
    )
    const usuario = userEvent.setup()

    renderizar()
    await screen.findByText('Pessoa 0')
    await usuario.click(screen.getByRole('button', { name: 'Próxima' }))
    await screen.findByText('Pessoa 1')

    const filtros = within(
      screen.getByRole('search', { name: 'Filtros do acompanhamento' }),
    )
    await waitFor(() =>
      expect(
        filtros.getByRole('option', { name: 'Onboarding' }),
      ).toBeInTheDocument(),
    )
    await usuario.selectOptions(filtros.getByLabelText('Trilha'), 'Onboarding')
    await usuario.selectOptions(
      filtros.getByLabelText('Área do colaborador'),
      'Tecnologia',
    )
    await usuario.selectOptions(filtros.getByLabelText('Status'), 'Atrasada')

    await waitFor(() => {
      const ultima = urls[urls.length - 1].searchParams
      expect(ultima.get('trilhaId')).toBe(
        '44444444-4444-4444-4444-444444444444',
      )
      expect(ultima.get('areaId')).toBe('33333333-3333-3333-3333-333333333333')
      expect(ultima.get('status')).toBe('ATRASADA')
      expect(ultima.get('page')).toBe('0')
    })
    expect(await screen.findByText(/Página 1 de 2/)).toBeInTheDocument()
  })

  it('exporta o CSV respeitando os filtros aplicados', async () => {
    let urlExportacao: URL | null = null
    server.use(
      http.get('*/api/atribuicoes/exportar', ({ request }) => {
        urlExportacao = new URL(request.url)
        return new HttpResponse('Colaborador;Trilha\n', {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="acompanhamento.csv"',
          },
        })
      }),
    )
    const criarUrl = vi.fn(() => 'blob:csv')
    const revogarUrl = vi.fn()
    Object.assign(URL, {
      createObjectURL: criarUrl,
      revokeObjectURL: revogarUrl,
    })
    const clique = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    const usuario = userEvent.setup()

    renderizar()
    await tabela()
    await usuario.selectOptions(screen.getByLabelText('Status'), 'Atrasada')
    await usuario.click(screen.getByRole('button', { name: 'Exportar CSV' }))

    expect(
      await screen.findByText(
        'Exportação concluída. O download do CSV começou.',
      ),
    ).toBeInTheDocument()
    expect(urlExportacao!.searchParams.get('status')).toBe('ATRASADA')
    expect(urlExportacao!.searchParams.get('formato')).toBe('csv')
    expect(criarUrl).toHaveBeenCalledOnce()
    expect(clique).toHaveBeenCalledOnce()
    const link = clique.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe('acompanhamento.csv')
  })

  it('mostra o erro da exportação sem esconder a tabela', async () => {
    server.use(
      http.get(
        '*/api/atribuicoes/exportar',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    const usuario = userEvent.setup()

    renderizar()
    await tabela()
    await usuario.click(screen.getByRole('button', { name: 'Exportar CSV' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O servidor não conseguiu concluir a operação.',
    )
    expect(await tabela()).toBeInTheDocument()
  })

  it('abre o painel do colaborador com totais e trilhas', async () => {
    let pedido = ''
    server.use(
      http.get('*/api/atribuicoes/colaboradores/:usuarioId', ({ params }) => {
        pedido = String(params.usuarioId)
        return HttpResponse.json(
          criarColaboradorAcompanhamento([
            criarAtribuicao({
              id: 'x-1',
              status: 'CONCLUIDA',
              percentual: 100,
            }),
            criarAtribuicao({
              id: 'x-2',
              trilha: { id: 't-9', nome: 'Compliance' },
              status: 'ATRASADA',
            }),
          ]),
        )
      }),
    )
    const usuario = userEvent.setup()

    renderizar()
    const botao = await screen.findByRole('button', {
      name: 'Ver trilhas de Ana Souza',
    })
    await usuario.click(botao)

    const painel = await screen.findByRole('dialog', { name: 'Ana Souza' })
    expect(pedido).toBe('00000000-0000-0000-0000-000000000001')
    const totais = await within(painel).findByText('Atrasadas')
    expect(totais.nextElementSibling).toHaveTextContent('1')
    const lista = within(
      within(painel).getByRole('list', { name: 'Trilhas de Ana Souza' }),
    )
    expect(lista.getByRole('link', { name: 'Compliance' })).toHaveAttribute(
      'href',
      '/trilhas/t-9',
    )

    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(botao).toHaveFocus()
  })

  it('mostra o erro do painel do colaborador', async () => {
    server.use(
      http.get(
        '*/api/atribuicoes/colaboradores/:usuarioId',
        () => new HttpResponse(null, { status: 404 }),
      ),
    )
    const usuario = userEvent.setup()

    renderizar()
    await usuario.click(
      await screen.findByRole('button', { name: 'Ver trilhas de Ana Souza' }),
    )

    const painel = await screen.findByRole('dialog')
    expect(await within(painel).findByRole('alert')).toHaveTextContent(
      'Colaborador não encontrado.',
    )
  })

  it('recusa o colaborador com a página 403 ao acessar a rota direto', async () => {
    let consultou = false
    server.use(
      http.get('*/api/atribuicoes', () => {
        consultou = true
        return HttpResponse.json(criarPagina([]))
      }),
    )

    renderizar(colaborador)

    expect(
      await screen.findByRole('heading', { name: 'Acesso negado' }),
    ).toBeInTheDocument()
    expect(consultou).toBe(false)
  })

  it('aparece no menu do gestor', async () => {
    renderizarComProvedores({ rota: '/dashboard', usuario: gestor })
    const menu = await screen.findByRole('navigation')
    expect(
      within(menu).getByRole('link', { name: /Acompanhamento/ }),
    ).toHaveAttribute('href', '/acompanhamento')
  })

  it('não aparece no menu do colaborador', async () => {
    renderizarComProvedores({ rota: '/dashboard', usuario: colaborador })
    const menu = await screen.findByRole('navigation')
    await within(menu).findByRole('link', { name: /Trilhas/ })
    expect(
      within(menu).queryByRole('link', { name: /Acompanhamento/ }),
    ).toBeNull()
  })
})
