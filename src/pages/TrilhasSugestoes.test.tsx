import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { iniciarTrilha } from '../services/trilhaService.ts'
import type { SugestoesTrilhas } from '../types/trilha.ts'
import {
  criarProgressoTrilha,
  criarTrilhaResumo,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

const SUGESTOES: SugestoesTrilhas = {
  origem: 'IA',
  sugestoes: [
    {
      trilha: criarTrilhaResumo({ id: 'sug-1', nome: 'Comunicação assertiva' }),
      motivo: 'Combina com a meta de comunicação do seu PDI.',
    },
    {
      trilha: criarTrilhaResumo({ id: 'sug-2', nome: 'Negociação' }),
      motivo: 'Você consultou o tema na IA nesta semana.',
    },
  ],
}

function responderSugestoes(corpo: SugestoesTrilhas) {
  server.use(
    http.get('*/api/trilhas/sugestoes', () => HttpResponse.json(corpo)),
  )
}

function abrir(papel: 'ADMIN' | 'COLABORADOR' = 'COLABORADOR') {
  return renderizarComProvedores({
    rota: '/trilhas',
    usuario: criarUsuario({ papel }),
  })
}

/** A listagem já carregou: a partir daqui, as sugestões ou chegaram ou não vêm. */
async function listagemPronta() {
  await screen.findByRole('list', { name: 'Trilhas' })
}

/** Com a suíte inteira rodando, a primeira renderização pode passar de 1 s. */
const ESPERA = { timeout: 3000 }

function botaoIa() {
  return screen.getByRole('button', { name: /^IA/ })
}

async function abrirPainel(user: ReturnType<typeof userEvent.setup>) {
  await listagemPronta()
  await user.click(botaoIa())
  return screen.getByRole('dialog', { name: 'Assistente de trilhas' })
}

describe('TrilhasPage — IA (sugestões e ajuda)', () => {
  it('o botão IA fica ao lado do PDI e mostra quantas sugestões há', async () => {
    responderSugestoes(SUGESTOES)
    abrir()

    await waitFor(
      () => expect(botaoIa()).toHaveAccessibleName('IA 2 sugestões de trilha'),
      ESPERA,
    )
    const pdi = screen.getByRole('link', { name: 'Meu PDI' })
    expect(pdi.nextElementSibling).toBe(botaoIa())
  })

  it('o painel mostra as sugestões com o motivo, e cada uma leva ao detalhe', async () => {
    const user = userEvent.setup()
    responderSugestoes(SUGESTOES)
    abrir()
    await waitFor(() => expect(botaoIa()).toHaveTextContent('2'), ESPERA)

    const painel = await abrirPainel(user)
    const secao = within(
      within(painel).getByRole('region', { name: 'Sugeridas para você' }),
    )

    expect(secao.getByText('Sugestão da IA')).toBeInTheDocument()
    expect(
      secao.getByText('Combina com a meta de comunicação do seu PDI.'),
    ).toBeInTheDocument()
    expect(
      secao.getByRole('link', { name: /Comunicação assertiva/ }),
    ).toHaveAttribute('href', '/trilhas/sug-1')
    expect(secao.getByRole('link', { name: /Negociação/ })).toHaveAttribute(
      'href',
      '/trilhas/sug-2',
    )
  })

  it('sem sugestões, o painel não mostra a seção (só a ajuda)', async () => {
    const user = userEvent.setup()
    responderSugestoes({ origem: 'IA', sugestoes: [] })
    abrir()

    const painel = await abrirPainel(user)

    expect(botaoIa()).toHaveAccessibleName('IA')
    expect(
      within(painel).queryByRole('region', { name: 'Sugeridas para você' }),
    ).not.toBeInTheDocument()
    expect(
      within(painel).getByRole('region', { name: 'Peça ajuda à IA' }),
    ).toBeInTheDocument()
  })

  it('indica quando a recomendação é por área (a IA não respondeu)', async () => {
    const user = userEvent.setup()
    responderSugestoes({ ...SUGESTOES, origem: 'AREA' })
    abrir()
    await waitFor(() => expect(botaoIa()).toHaveTextContent('2'), ESPERA)

    const painel = within(await abrirPainel(user))

    expect(painel.getByText('Recomendação por área')).toBeInTheDocument()
    expect(
      painel.getByText(/A IA não está disponível agora/),
    ).toBeInTheDocument()
    expect(painel.queryByText('Sugestão da IA')).not.toBeInTheDocument()
  })

  it('erro nas sugestões não mostra mensagem e não afeta a listagem', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/trilhas/sugestoes', () =>
        HttpResponse.json({ message: 'IA fora do ar' }, { status: 503 }),
      ),
    )
    abrir()

    expect(
      await screen.findByRole('link', { name: /Onboarding/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    const painel = await abrirPainel(user)
    expect(
      within(painel).queryByRole('region', { name: 'Sugeridas para você' }),
    ).not.toBeInTheDocument()
  })

  it('a listagem aparece primeiro, mesmo com as sugestões lentas', async () => {
    server.use(
      http.get('*/api/trilhas/sugestoes', async () => {
        await delay(400)
        return HttpResponse.json(SUGESTOES)
      }),
    )
    abrir()

    await listagemPronta()
    expect(botaoIa()).toHaveAccessibleName('IA')

    await waitFor(() => expect(botaoIa()).toHaveTextContent('2'), ESPERA)
  })

  it('trilha já iniciada não entra nas sugestões', async () => {
    responderSugestoes({
      origem: 'IA',
      sugestoes: [
        ...SUGESTOES.sugestoes,
        {
          trilha: criarTrilhaResumo({
            id: 'sug-3',
            nome: 'Já começada',
            progresso: criarProgressoTrilha({ status: 'EM_ANDAMENTO' }),
          }),
          motivo: 'Qualquer motivo.',
        },
      ],
    })
    abrir()

    await waitFor(() => expect(botaoIa()).toHaveTextContent('2'), ESPERA)
  })

  it('iniciar uma trilha a tira das sugestões (Observer)', async () => {
    const user = userEvent.setup()
    responderSugestoes(SUGESTOES)
    abrir()
    await waitFor(() => expect(botaoIa()).toHaveTextContent('2'), ESPERA)

    await act(async () => {
      await iniciarTrilha('sug-1')
    })

    await waitFor(() => expect(botaoIa()).toHaveTextContent('1'), ESPERA)
    const painel = within(await abrirPainel(user))
    expect(
      painel.queryByRole('link', { name: /Comunicação assertiva/ }),
    ).not.toBeInTheDocument()
    expect(painel.getByRole('link', { name: /Negociação/ })).toBeInTheDocument()
  })

  it('o motivo é texto simples: HTML vindo da IA não é interpretado', async () => {
    const user = userEvent.setup()
    const html = '<img src=x onerror="alert(1)"><b>importante</b>'
    responderSugestoes({
      origem: 'IA',
      sugestoes: [
        {
          trilha: criarTrilhaResumo({ id: 'sug-x', nome: 'Segurança' }),
          motivo: html,
        },
      ],
    })
    abrir()
    await waitFor(() => expect(botaoIa()).toHaveTextContent('1'), ESPERA)

    const painel = await abrirPainel(user)

    expect(within(painel).getByText(html)).toBeInTheDocument()
    expect(painel.querySelector('img, b')).toBeNull()
  })

  it('quem cria trilhas pede ajuda e abre o cadastro com o rascunho da IA', async () => {
    const user = userEvent.setup()
    let pergunta = ''
    server.use(
      http.post('*/api/trilhas/sugestoes/ajuda', async ({ request }) => {
        pergunta = ((await request.json()) as { pergunta: string }).pergunta
        return HttpResponse.json({
          texto: 'Montei um rascunho para a trilha "Onboarding: 30 dias".',
          rascunho: {
            nome: 'Onboarding: 30 dias',
            descricao: 'Primeiro mês na empresa.',
            areaId: null,
            prazoDias: 30,
            objetivos: 'Conhecer a empresa.',
          },
        })
      }),
    )
    abrir('ADMIN')

    const painel = within(await abrirPainel(user))
    await user.click(
      painel.getByRole('button', {
        name: 'Monte uma trilha de onboarding para novos colaboradores',
      }),
    )

    expect(
      await painel.findByText(/Montei um rascunho para a trilha/),
    ).toBeInTheDocument()
    expect(pergunta).toBe(
      'Monte uma trilha de onboarding para novos colaboradores',
    )
    await user.click(
      painel.getByRole('button', { name: 'Criar com este rascunho' }),
    )

    const formulario = await screen.findByRole('dialog', {
      name: /Nova trilha/,
    })
    expect(within(formulario).getByLabelText(/Nome/)).toHaveValue(
      'Onboarding: 30 dias',
    )
    expect(
      screen.queryByRole('dialog', { name: 'Assistente de trilhas' }),
    ).not.toBeInTheDocument()
  })

  it('colaborador conversa com a IA, mas não recebe o botão de criar', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/trilhas/sugestoes/ajuda', () =>
        HttpResponse.json({
          texto: 'Comece por Comunicação assertiva.',
          rascunho: {
            nome: 'Qualquer',
            descricao: null,
            areaId: null,
            prazoDias: null,
            objetivos: null,
          },
        }),
      ),
    )
    abrir('COLABORADOR')

    const painel = within(await abrirPainel(user))
    await user.type(
      painel.getByLabelText('Pergunta para a IA sobre trilhas'),
      'O que estudar?',
    )
    await user.click(painel.getByRole('button', { name: 'Enviar' }))

    expect(
      await painel.findByText('Comece por Comunicação assertiva.'),
    ).toBeInTheDocument()
    expect(
      painel.queryByRole('button', { name: 'Criar com este rascunho' }),
    ).not.toBeInTheDocument()
  })

  it('falha da IA na conversa mostra o erro e devolve a pergunta ao campo', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/trilhas/sugestoes/ajuda', () =>
        HttpResponse.json({ message: 'fora' }, { status: 503 }),
      ),
    )
    abrir()

    const painel = within(await abrirPainel(user))
    const campo = painel.getByLabelText('Pergunta para a IA sobre trilhas')
    await user.type(campo, 'Ajuda?')
    await user.click(painel.getByRole('button', { name: 'Enviar' }))

    expect(await painel.findByRole('alert')).toBeInTheDocument()
    expect(campo).toHaveValue('Ajuda?')
  })
})
