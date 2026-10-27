import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { InteracaoHistorico } from '../types/historico.ts'
import {
  criarInteracaoHistorico,
  criarPagina,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

const EU = criarUsuario({ papel: 'COLABORADOR' })
const ONTEM = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

function responder(...paginas: InteracaoHistorico[][]) {
  server.use(
    http.get('*/api/historico', ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page') ?? 0)
      return HttpResponse.json(
        criarPagina(paginas[page] ?? [], {
          number: page,
          totalPages: paginas.length,
          totalElements: paginas.flat().length,
        }),
      )
    }),
  )
}

function abrir(usuario = EU) {
  return renderizarComProvedores({ rota: '/historico', usuario })
}

describe('HistoricoPage', () => {
  it('mostra as interações reais por dia, com o texto de cada tipo', async () => {
    responder([
      criarInteracaoHistorico({ id: 'h1', tipo: 'TRILHA_INICIADA' }),
      criarInteracaoHistorico({
        id: 'h2',
        tipo: 'ASSISTENTE_CONSULTADO',
        detalhes: { encontrouFontes: true, quantidadeFontes: 2 },
      }),
      criarInteracaoHistorico({
        id: 'h3',
        tipo: 'TRILHA_CONCLUIDA',
        detalhes: { trilhaId: 't-lgpd', trilhaNome: 'LGPD' },
        criadoEm: ONTEM,
      }),
      criarInteracaoHistorico({
        id: 'h4',
        tipo: 'ASSISTENTE_CONSULTADO',
        detalhes: { encontrouFontes: false, quantidadeFontes: 0 },
        criadoEm: ONTEM,
      }),
    ])
    abrir()

    const hoje = within(await screen.findByRole('region', { name: 'Hoje' }))
    expect(
      hoje.getByRole('link', { name: /Você iniciou a trilha “Onboarding”/ }),
    ).toHaveAttribute('href', '/trilhas/44444444-4444-4444-4444-444444444444')
    expect(
      hoje.getByText('Você perguntou à IA (resposta com 2 fontes da base)'),
    ).toBeInTheDocument()

    const ontem = within(screen.getByRole('region', { name: 'Ontem' }))
    expect(
      ontem.getByRole('link', { name: /Você concluiu a trilha “LGPD”/ }),
    ).toHaveAttribute('href', '/trilhas/t-lgpd')
    expect(
      ontem.getByText('Você perguntou à IA (nada encontrado na base)'),
    ).toBeInTheDocument()
  })

  it('o administrador vê o nome de quem fez cada interação', async () => {
    const admin = criarUsuario({
      id: 'admin-1',
      papel: 'ADMIN',
      nomeCompleto: 'Marina Souza',
    })
    responder([
      criarInteracaoHistorico({
        id: 'h1',
        tipo: 'TRILHA_ACESSADA',
        usuario: { id: 'outro', nomeCompleto: 'Rafael Lima', email: 'r@x.com' },
      }),
    ])
    abrir(admin)

    expect(
      await screen.findByText('Rafael Lima acessou a trilha “Onboarding”'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Interações de todos/)).toBeInTheDocument()
  })

  it('sem nada registrado, mostra a mensagem de vazio', async () => {
    responder([])
    abrir()

    expect(
      await screen.findByText(/Nada no histórico ainda/),
    ).toBeInTheDocument()
  })

  it('erro na API mostra a mensagem e tenta de novo', async () => {
    const user = userEvent.setup()
    let chamadas = 0
    server.use(
      http.get('*/api/historico', () => {
        chamadas += 1
        return chamadas === 1
          ? HttpResponse.json({ message: 'boom' }, { status: 500 })
          : HttpResponse.json(criarPagina([criarInteracaoHistorico()]))
      }),
    )
    abrir()

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/servidor/i)
    await user.click(
      within(alerta).getByRole('button', { name: 'Tentar novamente' }),
    )

    expect(
      await screen.findByText(/Você iniciou a trilha “Onboarding”/),
    ).toBeInTheDocument()
  })

  it('carrega a próxima página pelo botão', async () => {
    const user = userEvent.setup()
    responder(
      [criarInteracaoHistorico({ id: 'p1' })],
      [
        criarInteracaoHistorico({
          id: 'p2',
          tipo: 'TRILHA_CONCLUIDA',
          detalhes: { trilhaId: 't2', trilhaNome: 'Vendas' },
        }),
      ],
    )
    abrir()

    await screen.findByText(/Você iniciou a trilha “Onboarding”/)
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }))

    expect(
      await screen.findByText(/Você concluiu a trilha “Vendas”/),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Carregar mais' }),
      ).not.toBeInTheDocument(),
    )
  })

  it('a busca filtra as interações carregadas, sem diferenciar acento', async () => {
    const user = userEvent.setup()
    responder([
      criarInteracaoHistorico({ id: 'h1' }),
      criarInteracaoHistorico({
        id: 'h2',
        tipo: 'ASSISTENTE_CONSULTADO',
        detalhes: { encontrouFontes: false },
      }),
    ])
    abrir()

    await screen.findByText(/Você iniciou a trilha/)
    await user.type(
      screen.getByLabelText('Pesquisar no histórico'),
      'perguntou',
    )

    expect(screen.getByText(/Você perguntou à IA/)).toBeInTheDocument()
    expect(screen.queryByText(/Você iniciou a trilha/)).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText('Pesquisar no histórico'))
    await user.type(screen.getByLabelText('Pesquisar no histórico'), 'xyz')
    expect(
      screen.getByText('Nada no histórico corresponde a “xyz”.'),
    ).toBeInTheDocument()
  })
})
