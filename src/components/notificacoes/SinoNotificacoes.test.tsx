import { act, configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { RouteObject } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from '../auth/ProtectedRoute.tsx'
import { AppLayout } from '../layout/AppLayout.tsx'
import { INTERVALO_ATUALIZACAO_MS } from '../../contexts/NotificacoesContext.tsx'
import { NotificacoesPage } from '../../pages/NotificacoesPage.tsx'
import {
  criarNotificacao,
  criarPagina,
  criarUsuario,
} from '../../test/factories.ts'
import { server } from '../../test/msw/server.ts'
import { renderizarComProvedores } from '../../test/renderWithProviders.tsx'
import type { Notificacao } from '../../types/notificacao.ts'

const TRILHA = '/trilhas/44444444-4444-4444-4444-444444444444'

// Cada teste monta o layout inteiro (sessão, /me e contador) antes do sino
// aparecer; com a suíte toda rodando em paralelo, 1 s de espera é pouco.
// Vale só para este arquivo: o Vitest isola os módulos por arquivo.
configure({ asyncUtilTimeout: 4000 })

/** Layout de verdade com páginas simples: o teste olha o sino, não as telas. */
const rotas: RouteObject[] = [
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <h1>Início</h1> },
          { path: '/trilhas/:id', element: <h1>Página da trilha</h1> },
          { path: '/notificacoes', element: <NotificacoesPage /> },
        ],
      },
    ],
  },
  { path: '/login', element: <h1>Tela de login</h1> },
]

/**
 * Servidor de notificações em memória: o total sempre bate com a lista, como
 * na API, e cada chamada fica registrada.
 */
function servidorDeNotificacoes(iniciais: Notificacao[]) {
  let notificacoes = iniciais.map((n) => ({ ...n }))
  const chamadas = { total: 0, lista: [] as URL[], lidas: [] as string[] }
  const naoLidas = () => notificacoes.filter((n) => !n.lida).length
  server.use(
    http.get('*/api/notificacoes/nao-lidas/total', () => {
      chamadas.total++
      return HttpResponse.json({ total: naoLidas() })
    }),
    http.get('*/api/notificacoes', ({ request }) => {
      const url = new URL(request.url)
      chamadas.lista.push(url)
      const page = Number(url.searchParams.get('page') ?? 0)
      const size = Number(url.searchParams.get('size') ?? 20)
      const filtradas =
        url.searchParams.get('naoLidas') === 'true'
          ? notificacoes.filter((n) => !n.lida)
          : notificacoes
      return HttpResponse.json(
        criarPagina(filtradas.slice(page * size, (page + 1) * size), {
          number: page,
          size,
          totalElements: filtradas.length,
          totalPages: Math.max(1, Math.ceil(filtradas.length / size)),
        }),
      )
    }),
    http.patch('*/api/notificacoes/:id/lida', ({ params }) => {
      const id = String(params.id)
      chamadas.lidas.push(id)
      notificacoes = notificacoes.map((n) =>
        n.id === id ? { ...n, lida: true } : n,
      )
      return HttpResponse.json(notificacoes.find((n) => n.id === id))
    }),
    http.patch('*/api/notificacoes/lidas', () => {
      notificacoes = notificacoes.map((n) => ({ ...n, lida: true }))
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return chamadas
}

function notificacoes(quantas: number): Notificacao[] {
  return Array.from({ length: quantas }, (_, i) =>
    criarNotificacao({
      id: `n-${i + 1}`,
      titulo: `Aviso ${i + 1}`,
      mensagem: `Mensagem ${i + 1}`,
      criadaEm: new Date(Date.now() - (i + 1) * 3_600_000).toISOString(),
    }),
  )
}

function renderizar(rota = '/dashboard') {
  return renderizarComProvedores({
    rota,
    usuario: criarUsuario(),
    routes: rotas,
  })
}

async function sino(nome: RegExp | string = /^Notificações/) {
  return screen.findByRole('button', { name: nome })
}

async function abrirPainel() {
  await userEvent.click(await sino())
  return screen.findByRole('dialog', { name: 'Notificações' })
}

describe('SinoNotificacoes', () => {
  it('mostra o número de não lidas e o total no nome do botão', async () => {
    servidorDeNotificacoes(notificacoes(3))
    renderizar()

    const botao = await sino('Notificações, 3 não lidas')
    expect(botao).toHaveTextContent('3')
    expect(botao).toHaveAttribute('aria-expanded', 'false')
  })

  it('acima de 9 mostra "9+", mas o nome do botão diz o número exato', async () => {
    servidorDeNotificacoes(notificacoes(12))
    renderizar()

    const botao = await sino('Notificações, 12 não lidas')
    expect(botao).toHaveTextContent('9+')
  })

  it('sem não lidas, não mostra número', async () => {
    servidorDeNotificacoes([])
    renderizar()

    expect(await sino('Notificações, nenhuma não lida')).not.toHaveTextContent(
      /\d/,
    )
  })

  it('abre o painel com as mais recentes, destacando as não lidas', async () => {
    const [nova, antiga] = notificacoes(2)
    servidorDeNotificacoes([nova, { ...antiga, lida: true }])
    renderizar()

    const painel = await abrirPainel()

    expect(await within(painel).findByText('Aviso 1')).toBeInTheDocument()
    expect(
      within(painel).getByRole('button', {
        name: /^Não lida, Trilha atribuída: Aviso 1/,
      }),
    ).toBeInTheDocument()
    expect(
      within(painel).getByRole('button', {
        name: /^Lida, Trilha atribuída: Aviso 2/,
      }),
    ).toBeInTheDocument()
    expect(within(painel).getByText('há 1 hora')).toBeInTheDocument()
    expect(await sino()).toHaveAttribute('aria-expanded', 'true')
  })

  it('clicar numa notificação marca como lida, diminui o contador e leva ao link', async () => {
    const chamadas = servidorDeNotificacoes(
      notificacoes(2).map((n, i) => (i === 0 ? { ...n, link: TRILHA } : n)),
    )
    renderizar()
    await sino('Notificações, 2 não lidas')

    const painel = await abrirPainel()
    await userEvent.click(
      await within(painel).findByRole('button', { name: /Aviso 1/ }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Página da trilha' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await sino('Notificações, 1 não lida')).toHaveTextContent('1')
    await waitFor(() => expect(chamadas.lidas).toEqual(['n-1']))
  })

  it('"Marcar todas como lidas" zera o contador e tira o destaque', async () => {
    servidorDeNotificacoes(notificacoes(3))
    renderizar()
    await sino('Notificações, 3 não lidas')

    const painel = await abrirPainel()
    await within(painel).findByText('Aviso 1')
    await userEvent.click(
      within(painel).getByRole('button', { name: 'Marcar todas como lidas' }),
    )

    expect(await sino('Notificações, nenhuma não lida')).not.toHaveTextContent(
      /\d/,
    )
    expect(
      within(painel).queryAllByRole('button', { name: /^Não lida/ }),
    ).toHaveLength(0)
    expect(
      within(painel).getByRole('button', { name: 'Marcar todas como lidas' }),
    ).toBeDisabled()
  })

  it('falha ao marcar todas mostra o erro e mantém o contador', async () => {
    servidorDeNotificacoes(notificacoes(2))
    server.use(
      http.patch('*/api/notificacoes/lidas', () =>
        HttpResponse.json({ message: 'falhou' }, { status: 500 }),
      ),
    )
    renderizar()
    await sino('Notificações, 2 não lidas')

    const painel = await abrirPainel()
    await within(painel).findByText('Aviso 1')
    await userEvent.click(
      within(painel).getByRole('button', { name: 'Marcar todas como lidas' }),
    )

    expect(await within(painel).findByRole('alert')).toBeInTheDocument()
    expect(await sino('Notificações, 2 não lidas')).toBeInTheDocument()
  })

  it('sem notificações, a mensagem é diferente da de erro', async () => {
    servidorDeNotificacoes([])
    renderizar()

    const painel = await abrirPainel()

    expect(await within(painel).findByText('Tudo em dia')).toBeInTheDocument()
    expect(within(painel).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('erro ao carregar mostra o aviso e "Tentar novamente" busca de novo', async () => {
    let falhar = true
    server.use(
      http.get('*/api/notificacoes', () =>
        falhar
          ? HttpResponse.json({ message: 'x' }, { status: 503 })
          : HttpResponse.json(
              criarPagina([criarNotificacao({ titulo: 'Voltou' })]),
            ),
      ),
    )
    renderizar()

    const painel = await abrirPainel()
    const alerta = await within(painel).findByRole('alert')
    expect(alerta).not.toHaveTextContent('Tudo em dia')

    falhar = false
    await userEvent.click(
      within(alerta).getByRole('button', { name: 'Tentar novamente' }),
    )
    expect(await within(painel).findByText('Voltou')).toBeInTheDocument()
  })

  it('Esc fecha o painel e devolve o foco ao sino', async () => {
    servidorDeNotificacoes(notificacoes(1))
    renderizar()

    const painel = await abrirPainel()
    await waitFor(() => expect(painel).toHaveFocus())
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await sino()).toHaveFocus()
  })

  it('abre e fecha só com o teclado', async () => {
    servidorDeNotificacoes(notificacoes(1))
    renderizar()

    ;(await sino()).focus()
    await userEvent.keyboard('{Enter}')
    expect(
      await screen.findByRole('dialog', { name: 'Notificações' }),
    ).toBeInTheDocument()

    ;(await sino()).focus()
    await userEvent.keyboard(' ')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })

  it('clique fora fecha o painel', async () => {
    servidorDeNotificacoes(notificacoes(1))
    renderizar()

    await abrirPainel()
    await userEvent.click(
      await screen.findByRole('heading', { name: 'Início' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('"Ver todas" leva para /notificacoes', async () => {
    servidorDeNotificacoes(notificacoes(1))
    renderizar()

    const painel = await abrirPainel()
    await userEvent.click(
      within(painel).getByRole('link', { name: 'Ver todas' }),
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Notificações' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

/**
 * Espera com o setTimeout real: com o setInterval falso, o waitFor (que
 * também usa intervalo) não volta a conferir.
 */
async function esperarAte(condicao: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (condicao()) {
      return
    }
    await new Promise((resolver) => setTimeout(resolver, 20))
  }
  throw new Error('A condição não aconteceu a tempo.')
}

describe('atualização do contador', () => {
  let visibilidade: DocumentVisibilityState = 'visible'

  function mudarVisibilidade(estado: DocumentVisibilityState) {
    visibilidade = estado
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
  }

  beforeEach(() => {
    visibilidade = 'visible'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(
      () => visibilidade,
    )
    // Só o intervalo é falso: o MSW e as promessas seguem no relógio real.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('busca de novo a cada 60 segundos com a aba visível', async () => {
    const chamadas = servidorDeNotificacoes(notificacoes(1))
    renderizar()
    await sino('Notificações, 1 não lida')
    const antes = chamadas.total

    act(() => vi.advanceTimersByTime(INTERVALO_ATUALIZACAO_MS))
    await esperarAte(() => chamadas.total === antes + 1)
    act(() => vi.advanceTimersByTime(INTERVALO_ATUALIZACAO_MS))
    await esperarAte(() => chamadas.total === antes + 2)
  })

  it('para com a aba escondida e atualiza na hora quando ela volta', async () => {
    const chamadas = servidorDeNotificacoes(notificacoes(1))
    renderizar()
    await sino('Notificações, 1 não lida')
    const antes = chamadas.total

    mudarVisibilidade('hidden')
    act(() => vi.advanceTimersByTime(3 * INTERVALO_ATUALIZACAO_MS))
    // Dá tempo para uma requisição indevida aparecer.
    await new Promise((resolver) => setTimeout(resolver, 50))
    expect(chamadas.total).toBe(antes)

    mudarVisibilidade('visible')
    await esperarAte(() => chamadas.total === antes + 1)
    act(() => vi.advanceTimersByTime(INTERVALO_ATUALIZACAO_MS))
    await esperarAte(() => chamadas.total === antes + 2)
  })

  it('para quando o usuário desloga', async () => {
    const chamadas = servidorDeNotificacoes(notificacoes(1))
    renderizar()
    await sino('Notificações, 1 não lida')

    await userEvent.click(screen.getByRole('button', { name: 'Sair da conta' }))
    await screen.findByRole('heading', { name: 'Tela de login' })
    const antes = chamadas.total

    act(() => vi.advanceTimersByTime(3 * INTERVALO_ATUALIZACAO_MS))
    await new Promise((resolver) => setTimeout(resolver, 50))
    expect(chamadas.total).toBe(antes)
  })
})

describe('NotificacoesPage', () => {
  it('lista paginada, das mais recentes para as mais antigas', async () => {
    const chamadas = servidorDeNotificacoes(notificacoes(25))
    renderizar('/notificacoes')

    const lista = await screen.findByRole('list')
    expect(within(lista).getAllByRole('button')).toHaveLength(20)
    expect(within(lista).getAllByRole('button')[0]).toHaveAccessibleName(
      /Aviso 1\b/,
    )
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))

    expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument()
    expect(
      within(screen.getByRole('list')).getAllByRole('button'),
    ).toHaveLength(5)
    expect(chamadas.lista.at(-1)?.searchParams.get('page')).toBe('1')
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
  })

  it('filtra só as não lidas', async () => {
    const [a, b, c] = notificacoes(3)
    const chamadas = servidorDeNotificacoes([a, { ...b, lida: true }, c])
    renderizar('/notificacoes')
    await screen.findByText('Aviso 2')

    await userEvent.click(screen.getByRole('button', { name: /^Não lidas/ }))

    await waitFor(() =>
      expect(screen.queryByText('Aviso 2')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Aviso 1')).toBeInTheDocument()
    expect(screen.getByText('Aviso 3')).toBeInTheDocument()
    expect(chamadas.lista.at(-1)?.searchParams.get('naoLidas')).toBe('true')
    expect(screen.getByRole('button', { name: /^Não lidas/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('filtro sem resultado tem mensagem própria', async () => {
    servidorDeNotificacoes([{ ...criarNotificacao(), lida: true }])
    renderizar('/notificacoes')
    await screen.findByText('Nova trilha para você')

    await userEvent.click(screen.getByRole('button', { name: /^Não lidas/ }))

    expect(
      await screen.findByText('Nenhuma notificação não lida'),
    ).toBeInTheDocument()
  })

  it('marcar na página atualiza o sino (e vice-versa)', async () => {
    servidorDeNotificacoes(notificacoes(2).map((n) => ({ ...n, link: null })))
    renderizar('/notificacoes')
    await sino('Notificações, 2 não lidas')

    // Na página: o contador do sino cai.
    const pagina = screen.getByRole('main')
    const lista = await within(pagina).findByRole('list')
    await userEvent.click(
      within(lista).getByRole('button', { name: /^Não lida, .*Aviso 1/ }),
    )
    expect(await sino('Notificações, 1 não lida')).toBeInTheDocument()
    expect(
      within(lista).getByRole('button', { name: /^Lida, .*Aviso 1/ }),
    ).toBeInTheDocument()

    // No sino: a página tira o destaque sem buscar de novo.
    const painel = await abrirPainel()
    await within(painel).findByText('Aviso 2')
    await userEvent.click(
      within(painel).getByRole('button', { name: 'Marcar todas como lidas' }),
    )
    await waitFor(() =>
      expect(
        within(lista).queryAllByRole('button', { name: /^Não lida/ }),
      ).toHaveLength(0),
    )
    expect(
      within(pagina).getByRole('button', { name: 'Marcar todas como lidas' }),
    ).toBeDisabled()
  })

  it('erro ao carregar oferece tentar de novo', async () => {
    let falhar = true
    server.use(
      http.get('*/api/notificacoes', () =>
        falhar
          ? HttpResponse.json({ message: 'x' }, { status: 500 })
          : HttpResponse.json(
              criarPagina([criarNotificacao({ titulo: 'Ok' })]),
            ),
      ),
    )
    renderizar('/notificacoes')

    const alerta = await screen.findByRole('alert')
    falhar = false
    await userEvent.click(
      within(alerta).getByRole('button', { name: 'Tentar novamente' }),
    )

    expect(await screen.findByText('Ok')).toBeInTheDocument()
  })
})
