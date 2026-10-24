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
  it('devolve as sugestões com o motivo e a origem', async () => {
    server.use(
      http.get('*/api/trilhas/sugestoes', () =>
        HttpResponse.json({
          origem: 'IA',
          sugestoes: [
            { trilha: criarTrilhaResumo(), motivo: 'Combina com o seu PDI.' },
          ],
        }),
      ),
    )

    const resposta = await listarSugestoes()

    expect(resposta.origem).toBe('IA')
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

  describe('com o mock ligado (sem o endpoint)', () => {
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

      expect(resposta.origem).toBe('IA')
      expect(resposta.sugestoes.map((s) => s.trilha.id)).toEqual(['m-2'])
      expect(resposta.sugestoes[0].motivo).not.toBe('')
    })

    it('pedir para montar uma trilha devolve um rascunho pronto', async () => {
      vi.stubEnv('VITE_SUGESTOES_MOCK', 'true')

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

      expect(resposta.origem).toBe('AREA')
      expect(resposta.sugestoes[0].motivo).toBe('Trilha da área Tecnologia.')
    })
  })
})
