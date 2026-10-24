import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type {
  MensagemAssistente,
  SessaoAssistente,
} from '../types/assistente.ts'
import {
  criarMensagemAssistente,
  criarSessaoAssistente,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

const REEMBOLSO = criarSessaoAssistente({
  id: 's-reembolso',
  titulo: 'Política de reembolso',
  atualizadoEm: '2026-10-20T14:00:00Z',
})
const FERIAS = criarSessaoAssistente({
  id: 's-ferias',
  titulo: 'Como solicito férias?',
  atualizadoEm: '2026-10-19T10:00:00Z',
})
const CHAMADO = criarSessaoAssistente({
  id: 's-chamado',
  titulo: 'Como abrir um chamado de TI?',
  atualizadoEm: '2026-10-18T09:00:00Z',
})

/**
 * Backend do assistente em memória, sobre o MSW: listar, abrir, perguntar,
 * renomear e apagar mexem nos mesmos dados, como na API de verdade.
 */
function usarBackend(
  iniciais: SessaoAssistente[] = [REEMBOLSO, FERIAS, CHAMADO],
) {
  // Cópias: renomear e perguntar mexem nas sessões, e cada teste começa do zero.
  let sessoes = iniciais.map((s) => ({ ...s }))
  const mensagens = new Map<string, MensagemAssistente[]>(
    iniciais.map((s) => [
      s.id,
      [
        criarMensagemAssistente({
          id: `${s.id}-p`,
          papel: 'USUARIO',
          conteudo: `Pergunta de ${s.titulo}`,
          fontes: [],
        }),
        criarMensagemAssistente({
          id: `${s.id}-r`,
          conteudo: `Resposta sobre ${s.titulo}`,
        }),
      ],
    ]),
  )
  let relogio = Date.parse('2026-10-21T08:00:00Z')
  const agora = () => new Date((relogio += 1000)).toISOString()
  const naoEncontrada = () =>
    HttpResponse.json({ message: 'Sessão não encontrada' }, { status: 404 })

  server.use(
    http.get('*/api/assistente/sessoes', ({ request }) => {
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') ?? 0)
      const size = Number(url.searchParams.get('size') ?? 20)
      const ordenadas = [...sessoes].sort((a, b) =>
        b.atualizadoEm.localeCompare(a.atualizadoEm),
      )
      return HttpResponse.json({
        content: ordenadas.slice(page * size, page * size + size),
        page: {
          size,
          number: page,
          totalElements: ordenadas.length,
          totalPages: Math.max(1, Math.ceil(ordenadas.length / size)),
        },
      })
    }),
    http.post('*/api/assistente/sessoes', async ({ request }) => {
      const { titulo } = (await request.json()) as { titulo: string }
      const quando = agora()
      const nova = criarSessaoAssistente({
        id: `s-nova-${sessoes.length}`,
        titulo,
        criadoEm: quando,
        atualizadoEm: quando,
      })
      sessoes.push(nova)
      mensagens.set(nova.id, [])
      return HttpResponse.json(nova, { status: 201 })
    }),
    http.get('*/api/assistente/sessoes/:id/mensagens', ({ params }) => {
      const lista = mensagens.get(String(params.id))
      return lista ? HttpResponse.json(lista) : naoEncontrada()
    }),
    http.post(
      '*/api/assistente/sessoes/:id/mensagens',
      async ({ request, params }) => {
        const id = String(params.id)
        const sessao = sessoes.find((s) => s.id === id)
        if (!sessao) {
          return naoEncontrada()
        }
        const { conteudo } = (await request.json()) as { conteudo: string }
        const quando = agora()
        const pergunta = criarMensagemAssistente({
          id: `${id}-p-${quando}`,
          papel: 'USUARIO',
          conteudo,
          fontes: [],
        })
        const resposta = criarMensagemAssistente({
          id: `${id}-r-${quando}`,
          conteudo: `Resposta para: ${conteudo}`,
        })
        mensagens.get(id)!.push(pergunta, resposta)
        sessao.atualizadoEm = quando
        return HttpResponse.json(
          { sessao: { ...sessao }, pergunta, resposta },
          { status: 201 },
        )
      },
    ),
    http.patch('*/api/assistente/sessoes/:id', async ({ request, params }) => {
      const sessao = sessoes.find((s) => s.id === params.id)
      if (!sessao) {
        return naoEncontrada()
      }
      const { titulo } = (await request.json()) as { titulo: string }
      sessao.titulo = titulo
      return HttpResponse.json({ ...sessao })
    }),
    http.delete('*/api/assistente/sessoes/:id', ({ params }) => {
      sessoes = sessoes.filter((s) => s.id !== params.id)
      mensagens.delete(String(params.id))
      return new HttpResponse(null, { status: 204 })
    }),
  )
}

function abrir(rota = '/assistente') {
  return renderizarComProvedores({ rota, usuario: criarUsuario() })
}

async function painel() {
  return screen.findByRole('complementary', {
    name: 'Histórico de conversas',
  })
}

async function titulosDoPainel(): Promise<string[]> {
  const lista = await within(await painel()).findAllByRole('link', {
    name: /Política|férias|chamado|Novo assunto/i,
  })
  return lista.map(
    (link) => link.querySelector('span')?.textContent ?? link.textContent ?? '',
  )
}

describe('AssistentePage — histórico de conversas', () => {
  it('lista as conversas da mais recente para a mais antiga', async () => {
    usarBackend()
    abrir()

    expect(await titulosDoPainel()).toEqual([
      'Política de reembolso',
      'Como solicito férias?',
      'Como abrir um chamado de TI?',
    ])
    expect(screen.getByText('Como posso ajudar?')).toBeInTheDocument()
  })

  it('abre a conversa da URL (é o que acontece num F5) e continua perguntando nela', async () => {
    const user = userEvent.setup()
    usarBackend()
    abrir('/assistente/s-ferias')

    expect(
      await screen.findByText('Resposta sobre Como solicito férias?'),
    ).toBeInTheDocument()
    expect(
      within(await painel()).getByRole('link', {
        name: /Como solicito férias\?/,
      }),
    ).toHaveAttribute('aria-current', 'page')

    await user.type(
      screen.getByLabelText('Pergunta para o assistente'),
      'E o abono?',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(
      await screen.findByText('Resposta para: E o abono?'),
    ).toBeInTheDocument()
  })

  it('clicar numa conversa do painel abre as mensagens dela', async () => {
    const user = userEvent.setup()
    usarBackend()
    abrir()

    await user.click(
      await within(await painel()).findByRole('link', {
        name: /chamado de TI/,
      }),
    )

    expect(
      await screen.findByText('Resposta sobre Como abrir um chamado de TI?'),
    ).toBeInTheDocument()
    expect(
      within(await painel()).getByRole('link', { name: /chamado de TI/ }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('uma pergunta nova leva a conversa para o topo da lista', async () => {
    const user = userEvent.setup()
    usarBackend()
    abrir('/assistente/s-chamado')
    await screen.findByText('Resposta sobre Como abrir um chamado de TI?')

    await user.type(
      screen.getByLabelText('Pergunta para o assistente'),
      'E a prioridade alta?',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('Resposta para: E a prioridade alta?')

    await waitFor(async () =>
      expect((await titulosDoPainel())[0]).toBe('Como abrir um chamado de TI?'),
    )
  })

  it('a primeira pergunta de uma conversa nova cria a conversa no topo do histórico', async () => {
    const user = userEvent.setup()
    usarBackend()
    abrir()
    await titulosDoPainel()

    await user.type(
      screen.getByLabelText('Pergunta para o assistente'),
      'Novo assunto: LGPD',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(
      await screen.findByText('Resposta para: Novo assunto: LGPD'),
    ).toBeInTheDocument()
    const nova = within(await painel()).getByRole('link', {
      name: /Novo assunto: LGPD/,
    })
    expect(nova).toHaveAttribute('aria-current', 'page')
    expect((await titulosDoPainel())[0]).toBe('Novo assunto: LGPD')
  })

  it('renomeia uma conversa', async () => {
    const user = userEvent.setup()
    usarBackend()
    abrir()

    await user.click(
      await within(await painel()).findByRole('button', {
        name: /Renomear conversa “Como solicito férias\?”/,
      }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Renomear conversa' })
    const campo = within(dialogo).getByLabelText('Título')
    await user.clear(campo)
    await user.type(campo, 'Férias e abono')
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Renomear conversa' }),
      ).not.toBeInTheDocument(),
    )
    expect(
      within(await painel()).getByRole('link', { name: /Férias e abono/ }),
    ).toBeInTheDocument()
  })

  it('pede confirmação antes de apagar, e cancelar não apaga nada', async () => {
    const user = userEvent.setup()
    usarBackend()
    abrir()

    await user.click(
      await within(await painel()).findByRole('button', {
        name: /Apagar conversa “Como solicito férias\?”/,
      }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Apagar conversa?' })
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))

    expect(
      within(await painel()).getByRole('link', {
        name: /Como solicito férias\?/,
      }),
    ).toBeInTheDocument()
  })

  it('apagar a conversa aberta volta para uma conversa nova', async () => {
    const user = userEvent.setup()
    usarBackend()
    abrir('/assistente/s-reembolso')
    await screen.findByText('Resposta sobre Política de reembolso')

    await user.click(
      within(await painel()).getByRole('button', {
        name: /Apagar conversa “Política de reembolso”/,
      }),
    )
    await user.click(
      within(
        screen.getByRole('dialog', { name: 'Apagar conversa?' }),
      ).getByRole('button', { name: 'Apagar' }),
    )

    expect(await screen.findByText('Como posso ajudar?')).toBeInTheDocument()
    expect(
      within(await painel()).queryByRole('link', {
        name: /Política de reembolso/,
      }),
    ).not.toBeInTheDocument()
  })

  it('link de conversa de outro usuário mostra "conversa não encontrada"', async () => {
    usarBackend()
    abrir('/assistente/conversa-de-outra-pessoa')

    expect(
      await screen.findByRole('heading', { name: 'Conversa não encontrada' }),
    ).toBeInTheDocument()
    // O histórico continua de pé ao lado.
    expect(await titulosDoPainel()).toHaveLength(3)
  })

  it('carrega mais conversas pelo botão', async () => {
    const user = userEvent.setup()
    usarBackend(
      Array.from({ length: 25 }, (_, i) =>
        criarSessaoAssistente({
          id: `s-${i}`,
          titulo: `Conversa ${i + 1}`,
          atualizadoEm: new Date(
            Date.UTC(2026, 9, 20, 12, 0, 59 - i),
          ).toISOString(),
        }),
      ),
    )
    abrir()

    const lista = await within(await painel()).findAllByRole('link', {
      name: /^Conversa \d+/,
    })
    expect(lista).toHaveLength(20)

    await user.click(
      within(await painel()).getByRole('button', {
        name: 'Carregar mais conversas',
      }),
    )

    await waitFor(async () =>
      expect(
        within(await painel()).getAllByRole('link', { name: /^Conversa \d+/ }),
      ).toHaveLength(25),
    )
    expect(
      within(await painel()).queryByRole('button', {
        name: 'Carregar mais conversas',
      }),
    ).not.toBeInTheDocument()
  })

  it('mostra a lista vazia quando ainda não há conversas', async () => {
    usarBackend([])
    abrir()

    expect(
      await within(await painel()).findByText(/Nenhuma conversa ainda/),
    ).toBeInTheDocument()
  })

  it('erro no histórico fica no painel, sem derrubar a conversa aberta', async () => {
    const user = userEvent.setup()
    usarBackend()
    server.use(
      http.get(
        '*/api/assistente/sessoes',
        () => HttpResponse.json({ message: 'falhou' }, { status: 500 }),
        { once: true },
      ),
    )
    abrir('/assistente/s-ferias')

    expect(await within(await painel()).findByRole('alert')).toHaveTextContent(
      /servidor/i,
    )
    expect(
      await screen.findByText('Resposta sobre Como solicito férias?'),
    ).toBeInTheDocument()

    await user.click(
      within(await painel()).getByRole('button', { name: 'Tentar de novo' }),
    )
    expect(await titulosDoPainel()).toHaveLength(3)
  })

  it('as setas do teclado andam entre as conversas do painel', async () => {
    const user = userEvent.setup()
    usarBackend()
    abrir()

    const [primeira, segunda, terceira] = await within(
      await painel(),
    ).findAllByRole('link', { name: /Política|férias|chamado/ })
    primeira.focus()

    await user.keyboard('{ArrowDown}')
    expect(segunda).toHaveFocus()
    await user.keyboard('{End}')
    expect(terceira).toHaveFocus()
    await user.keyboard('{Home}')
    expect(primeira).toHaveFocus()
  })
})
