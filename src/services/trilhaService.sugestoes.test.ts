import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { assinarEventosTrilha } from './eventosTrilha.ts'
import {
  iniciarTrilha,
  listarSugestoes,
  pedirAjudaTrilhas,
  TrilhaServiceError,
} from './trilhaService.ts'
import { criarPaginaTrilhas, criarTrilhaResumo } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'

describe('trilhaService — sugestões da IA', () => {
  it('devolve as sugestões no formato da API, com o motivo', async () => {
    server.use(
      http.get('*/api/trilhas/sugestoes', () =>
        HttpResponse.json({
          geradoPorIa: true,
          aviso: null,
          sugestoes: [
            {
              id: 'sug-1',
              nome: 'Onboarding',
              area: null,
              objetivos: 'Conhecer a empresa',
              motivo: 'Combina com o seu PDI.',
            },
          ],
        }),
      ),
    )

    const resposta = await listarSugestoes()

    expect(resposta.geradoPorIa).toBe(true)
    expect(resposta.sugestoes[0].nome).toBe('Onboarding')
    expect(resposta.sugestoes[0].motivo).toBe('Combina com o seu PDI.')
  })

  it('falha com TrilhaServiceError quando a API cai', async () => {
    server.use(
      http.get('*/api/trilhas/sugestoes', () =>
        HttpResponse.json({ message: 'boom' }, { status: 503 }),
      ),
    )

    await expect(listarSugestoes()).rejects.toBeInstanceOf(TrilhaServiceError)
  })

  it('iniciar uma trilha avisa quem assina os eventos (Observer)', async () => {
    const ouvinte = vi.fn()
    const cancelar = assinarEventosTrilha(ouvinte)

    await iniciarTrilha('trilha-1')
    cancelar()

    expect(ouvinte).toHaveBeenCalledWith({
      tipo: 'trilha-iniciada',
      trilhaId: 'trilha-1',
    })
  })

  describe('ajuda da IA', () => {
    const SEM_ROTA = () =>
      HttpResponse.json({ message: 'Not Found' }, { status: 404 })

    it('usa a rota de ajuda quando ela existe, com texto e rascunho', async () => {
      server.use(
        http.post('*/api/trilhas/sugestoes/ajuda', () =>
          HttpResponse.json({
            texto: 'Montei o rascunho.',
            rascunho: {
              nome: 'LGPD na prática',
              descricao: null,
              areaId: null,
              prazoDias: 14,
              objetivos: null,
            },
          }),
        ),
      )

      const resposta = await pedirAjudaTrilhas('Monte uma trilha de LGPD')

      expect(resposta.rascunho?.nome).toBe('LGPD na prática')
    })

    it('sem a rota no backend (404), pergunta ao assistente da dev e reaproveita a sessão', async () => {
      let sessoesCriadas = 0
      const perguntas: string[] = []
      server.use(
        http.post('*/api/trilhas/sugestoes/ajuda', SEM_ROTA),
        http.post('*/api/assistente/sessoes', async ({ request }) => {
          sessoesCriadas += 1
          expect(await request.json()).toMatchObject({
            contexto: 'CONHECIMENTO',
          })
          return HttpResponse.json({ id: 'sessao-1' }, { status: 201 })
        }),
        http.post(
          '*/api/assistente/sessoes/:id/mensagens',
          async ({ request, params }) => {
            const { conteudo } = (await request.json()) as { conteudo: string }
            perguntas.push(`${String(params.id)}:${conteudo}`)
            return HttpResponse.json({
              resposta: {
                conteudo: 'Comece pela política de reembolso.',
                fontes: ['Política de Reembolso v3'],
              },
            })
          },
        ),
      )

      const primeira = await pedirAjudaTrilhas('O que estudar?')
      const segunda = await pedirAjudaTrilhas('E depois?', primeira.sessaoId)

      expect(primeira).toMatchObject({
        texto: 'Comece pela política de reembolso.',
        rascunho: null,
        fontes: ['Política de Reembolso v3'],
        sessaoId: 'sessao-1',
      })
      expect(segunda.sessaoId).toBe('sessao-1')
      expect(sessoesCriadas).toBe(1)
      expect(perguntas).toEqual([
        'sessao-1:O que estudar?',
        'sessao-1:E depois?',
      ])
    })

    it('sessão apagada (404) é recriada uma vez', async () => {
      server.use(
        http.post('*/api/trilhas/sugestoes/ajuda', SEM_ROTA),
        http.post('*/api/assistente/sessoes', () =>
          HttpResponse.json({ id: 'nova' }, { status: 201 }),
        ),
        http.post('*/api/assistente/sessoes/:id/mensagens', ({ params }) =>
          params.id === 'antiga'
            ? HttpResponse.json(
                { message: 'Sessão não encontrada' },
                { status: 404 },
              )
            : HttpResponse.json({ resposta: { conteudo: 'ok', fontes: [] } }),
        ),
      )

      const resposta = await pedirAjudaTrilhas('Oi', 'antiga')

      expect(resposta.sessaoId).toBe('nova')
    })

    it('IA fora do ar (503) não cai no plano B e avisa', async () => {
      let assistenteChamado = false
      server.use(
        http.post('*/api/trilhas/sugestoes/ajuda', () =>
          HttpResponse.json({ message: 'IA indisponível' }, { status: 503 }),
        ),
        http.post('*/api/assistente/sessoes', () => {
          assistenteChamado = true
          return HttpResponse.json({ id: 'x' }, { status: 201 })
        }),
      )

      await expect(pedirAjudaTrilhas('Oi')).rejects.toThrow(
        'A IA não está disponível agora. Tente de novo em instantes.',
      )
      expect(assistenteChamado).toBe(false)
    })

    it('assistente fora do ar no plano B também avisa', async () => {
      server.use(
        http.post('*/api/trilhas/sugestoes/ajuda', SEM_ROTA),
        http.post('*/api/assistente/sessoes', () =>
          HttpResponse.json({ id: 'sessao-1' }, { status: 201 }),
        ),
        http.post('*/api/assistente/sessoes/:id/mensagens', () =>
          HttpResponse.json({ message: 'IA indisponível' }, { status: 503 }),
        ),
      )

      await expect(pedirAjudaTrilhas('Oi')).rejects.toThrow(
        'A IA não está disponível agora. Tente de novo em instantes.',
      )
    })
  })

  describe('com os mocks ligados (sem o backend)', () => {
    it('monta as sugestões a partir do catálogo e tira as iniciadas', async () => {
      vi.stubEnv('VITE_SUGESTOES_MOCK', 'true')
      server.use(
        http.get('*/api/trilhas', () =>
          HttpResponse.json(
            criarPaginaTrilhas([
              criarTrilhaResumo({ id: 'm-1', nome: 'Um' }),
              criarTrilhaResumo({ id: 'm-2', nome: 'Dois' }),
            ]),
          ),
        ),
      )

      await iniciarTrilha('m-1')
      const resposta = await listarSugestoes()

      expect(resposta.geradoPorIa).toBe(true)
      expect(resposta.sugestoes.map((s) => s.id)).toEqual(['m-2'])
      expect(resposta.sugestoes[0].motivo).not.toBe('')
    })

    it('pedir para montar uma trilha devolve um rascunho pronto', async () => {
      vi.stubEnv('VITE_AJUDA_IA_MOCK', 'true')

      const resposta = await pedirAjudaTrilhas(
        'Monte uma trilha de atendimento ao cliente',
      )

      expect(resposta.rascunho?.nome).toBe(
        'Excelência no atendimento ao cliente',
      )
      expect(resposta.texto).toMatch(/rascunho/)
    })

    it('`area` simula a recomendação por área', async () => {
      vi.stubEnv('VITE_SUGESTOES_MOCK', 'area')
      server.use(
        http.get('*/api/trilhas', () =>
          HttpResponse.json(
            criarPaginaTrilhas([criarTrilhaResumo({ id: 'a-1' })]),
          ),
        ),
      )

      const resposta = await listarSugestoes()

      expect(resposta.geradoPorIa).toBe(false)
      expect(resposta.aviso).toMatch(/trilhas da sua área/)
      expect(resposta.sugestoes[0].motivo).toBe('Trilha da área Tecnologia.')
    })
  })
})
