import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { iniciarTrilha } from '../services/trilhaService.ts'
import type { SugestaoTrilha, SugestoesTrilhas } from '../types/trilha.ts'
import {
  criarPaginaTrilhas,
  criarProgressoTrilha,
  criarTrilhaResumo,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

/** Uma sugestão no formato do `SugestaoTrilhaResponse` da API. */
function sugestao(id: string, nome: string, motivo: string): SugestaoTrilha {
  return {
    id,
    nome,
    area: { id: '33333333-3333-3333-3333-333333333333', nome: 'Tecnologia' },
    objetivos: null,
    motivo,
  }
}

const SUGESTOES: SugestoesTrilhas = {
  geradoPorIa: true,
  aviso: null,
  sugestoes: [
    sugestao(
      'sug-1',
      'Comunicação assertiva',
      'Combina com a meta de comunicação do seu PDI.',
    ),
    sugestao(
      'sug-2',
      'Negociação',
      'Você consultou o tema na IA nesta semana.',
    ),
  ],
}

const AVISO_SEM_IA =
  'Não foi possível gerar as sugestões com a IA agora. Estas são as trilhas da sua área.'

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
    responderSugestoes({ geradoPorIa: true, aviso: null, sugestoes: [] })
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
    responderSugestoes({
      ...SUGESTOES,
      geradoPorIa: false,
      aviso: AVISO_SEM_IA,
    })
    abrir()
    await waitFor(() => expect(botaoIa()).toHaveTextContent('2'), ESPERA)

    const painel = within(await abrirPainel(user))

    expect(painel.getByText('Recomendação por área')).toBeInTheDocument()
    // O aviso é o texto que a própria API manda.
    expect(painel.getByText(AVISO_SEM_IA)).toBeInTheDocument()
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

  it('trilha já iniciada não entra nas sugestões (a API só tira as concluídas)', async () => {
    const user = userEvent.setup()
    responderSugestoes(SUGESTOES)
    // "Minhas trilhas": a Negociação já está em andamento.
    server.use(
      http.get('*/api/trilhas', () =>
        HttpResponse.json(
          criarPaginaTrilhas([
            criarTrilhaResumo({
              id: 'sug-2',
              nome: 'Negociação',
              progresso: criarProgressoTrilha({ status: 'EM_ANDAMENTO' }),
            }),
          ]),
        ),
      ),
    )
    abrir()

    await waitFor(() => expect(botaoIa()).toHaveTextContent('1'), ESPERA)
    const painel = within(await abrirPainel(user))
    expect(
      painel.getByRole('link', { name: /Comunicação assertiva/ }),
    ).toBeInTheDocument()
    expect(
      painel.queryByRole('link', { name: /Negociação/ }),
    ).not.toBeInTheDocument()
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
      geradoPorIa: true,
      aviso: null,
      sugestoes: [sugestao('sug-x', 'Segurança', html)],
    })
    abrir()
    await waitFor(() => expect(botaoIa()).toHaveTextContent('1'), ESPERA)

    const painel = await abrirPainel(user)

    expect(within(painel).getByText(html)).toBeInTheDocument()
    expect(painel.querySelector('img, b')).toBeNull()
  })

  it('quem cria trilhas pede uma trilha completa e ela é criada com as etapas, em ordem', async () => {
    const user = userEvent.setup()
    let pergunta = ''
    let trilhaCriada: unknown = null
    const etapasCriadas: unknown[] = []
    server.use(
      http.post('*/api/trilhas/sugestoes/ajuda', async ({ request }) => {
        pergunta = ((await request.json()) as { pergunta: string }).pergunta
        return HttpResponse.json({
          texto: 'Montei a trilha "Onboarding: 30 dias" com 2 etapas.',
          rascunho: {
            nome: 'Onboarding: 30 dias',
            descricao: 'Primeiro mês na empresa.',
            areaId: null,
            prazoDias: 30,
            objetivos: 'Conhecer a empresa.',
            etapas: [
              {
                conteudoId: 'c-cultura',
                conteudoTitulo: 'Nossa cultura',
                conteudoTipo: 'VIDEO',
                titulo: 'Conheça a cultura',
                descricao: 'Valores e jeito de trabalhar.',
              },
              {
                conteudoId: 'c-ferramentas',
                conteudoTitulo: 'Guia de ferramentas',
                conteudoTipo: 'DOCUMENTO',
                titulo: 'Ferramentas do dia a dia',
                descricao: null,
              },
            ],
            conteudosFaltando: ['Mapa de quem é quem na empresa'],
          },
        })
      }),
      http.post('*/api/trilhas', async ({ request }) => {
        trilhaCriada = await request.json()
        return HttpResponse.json(
          criarTrilhaResumo({ id: 'nova', nome: 'Onboarding: 30 dias' }),
          { status: 201 },
        )
      }),
      http.post('*/api/trilhas/:id/etapas', async ({ request, params }) => {
        etapasCriadas.push({
          trilha: params.id,
          ...((await request.json()) as Record<string, unknown>),
        })
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    abrir('ADMIN')

    const painel = within(await abrirPainel(user))
    await user.click(
      painel.getByRole('button', {
        name: 'Monte uma trilha de onboarding para novos colaboradores',
      }),
    )

    const etapas = within(
      await painel.findByRole('list', { name: 'Etapas da trilha montada' }),
    )
    expect(pergunta).toBe(
      'Monte uma trilha de onboarding para novos colaboradores',
    )
    expect(etapas.getAllByRole('listitem')).toHaveLength(2)
    expect(etapas.getByText('Conheça a cultura')).toBeInTheDocument()
    expect(etapas.getByText(/Vídeo · Nossa cultura/)).toBeInTheDocument()
    expect(
      painel.getByText('Mapa de quem é quem na empresa'),
    ).toBeInTheDocument()

    await user.click(
      painel.getByRole('button', { name: 'Criar trilha com 2 etapas' }),
    )
    const formulario = within(
      await screen.findByRole('dialog', { name: /Nova trilha/ }),
    )
    expect(formulario.getByLabelText(/Nome/)).toHaveValue('Onboarding: 30 dias')
    await user.click(
      formulario.getByRole('button', { name: 'Criar trilha com 2 etapas' }),
    )

    // Abre o detalhe da trilha nova, com o aviso.
    expect(
      await screen.findByText(
        'Trilha “Onboarding: 30 dias” criada com 2 etapas.',
      ),
    ).toBeInTheDocument()
    expect(trilhaCriada).toMatchObject({
      nome: 'Onboarding: 30 dias',
      prazoDias: 30,
    })
    expect(etapasCriadas).toEqual([
      {
        trilha: 'nova',
        conteudoId: 'c-cultura',
        titulo: 'Conheça a cultura',
        descricao: 'Valores e jeito de trabalhar.',
      },
      {
        trilha: 'nova',
        conteudoId: 'c-ferramentas',
        titulo: 'Ferramentas do dia a dia',
        descricao: null,
      },
    ])
  })

  it('etapa recusada não desfaz a trilha: o detalhe avisa quantas faltaram', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/trilhas/sugestoes/ajuda', () =>
        HttpResponse.json({
          texto: 'Montei.',
          rascunho: {
            nome: 'LGPD',
            descricao: null,
            areaId: null,
            prazoDias: null,
            objetivos: null,
            etapas: [
              {
                conteudoId: 'ok',
                conteudoTitulo: 'A',
                conteudoTipo: 'TEXTO',
                titulo: 'A',
                descricao: null,
              },
              {
                conteudoId: 'despublicado',
                conteudoTitulo: 'B',
                conteudoTipo: 'TEXTO',
                titulo: 'B',
                descricao: null,
              },
            ],
            conteudosFaltando: [],
          },
        }),
      ),
      http.post('*/api/trilhas', () =>
        HttpResponse.json(criarTrilhaResumo({ id: 'nova', nome: 'LGPD' }), {
          status: 201,
        }),
      ),
      http.post('*/api/trilhas/:id/etapas', async ({ request }) => {
        const { conteudoId } = (await request.json()) as { conteudoId: string }
        return conteudoId === 'ok'
          ? HttpResponse.json({}, { status: 201 })
          : HttpResponse.json(
              { message: 'Conteúdo não publicado' },
              { status: 404 },
            )
      }),
    )
    abrir('ADMIN')

    const painel = within(await abrirPainel(user))
    await user.type(
      painel.getByLabelText('Pergunta para a IA sobre trilhas'),
      'Monte uma trilha de LGPD',
    )
    await user.click(painel.getByRole('button', { name: 'Enviar' }))
    await user.click(
      await painel.findByRole('button', { name: 'Criar trilha com 2 etapas' }),
    )
    await user.click(
      within(
        await screen.findByRole('dialog', { name: /Nova trilha/ }),
      ).getByRole('button', { name: 'Criar trilha com 2 etapas' }),
    )

    expect(
      await screen.findByText(
        /criada, mas 1 de 2 etapas não puderam ser adicionadas/,
      ),
    ).toBeInTheDocument()
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

    expect(await painel.findByRole('alert')).toHaveTextContent(
      'A IA não está disponível agora. Tente de novo em instantes.',
    )
    expect(campo).toHaveValue('Ajuda?')
  })

  it('sem a rota de ajuda no backend, responde o assistente da dev, com as fontes', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/trilhas/sugestoes/ajuda', () =>
        HttpResponse.json({ message: 'Not Found' }, { status: 404 }),
      ),
      http.post('*/api/assistente/sessoes', () =>
        HttpResponse.json({ id: 'sessao-1' }, { status: 201 }),
      ),
      http.post('*/api/assistente/sessoes/:id/mensagens', () =>
        HttpResponse.json({
          resposta: {
            conteudo: 'Comece pela política de reembolso.',
            fontes: ['Política de Reembolso v3'],
          },
        }),
      ),
    )
    abrir()

    const painel = within(await abrirPainel(user))
    await user.type(
      painel.getByLabelText('Pergunta para a IA sobre trilhas'),
      'O que estudar?',
    )
    await user.click(painel.getByRole('button', { name: 'Enviar' }))

    expect(
      await painel.findByText('Comece pela política de reembolso.'),
    ).toBeInTheDocument()
    expect(
      within(painel.getByRole('list', { name: 'Fontes' })).getByText(
        'Política de Reembolso v3',
      ),
    ).toBeInTheDocument()
    expect(painel.queryByRole('alert')).not.toBeInTheDocument()
  })
})
