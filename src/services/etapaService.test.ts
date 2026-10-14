import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  concluirEtapa,
  EtapaServiceError,
  reordenarEtapas,
} from './etapaService.ts'
import { criarEtapa, criarProgressoTrilha } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'

describe('etapaService', () => {
  it('conclui a etapa e devolve o progresso recalculado', async () => {
    server.use(
      http.post('*/api/trilhas/:id/etapas/:etapaId/concluir', ({ params }) =>
        HttpResponse.json({
          etapaId: params.etapaId,
          progresso: criarProgressoTrilha({ percentual: 50 }),
        }),
      ),
    )

    const resposta = await concluirEtapa('t1', 'e1')

    expect(resposta.etapaId).toBe('e1')
    expect(resposta.progresso.percentual).toBe(50)
  })

  it('manda todas as etapas na nova ordem', async () => {
    let corpo: unknown
    server.use(
      http.patch('*/api/trilhas/:id/etapas/ordem', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json([criarEtapa()])
      }),
    )

    await reordenarEtapas('t1', ['b', 'a'])

    expect(corpo).toEqual({ etapaIds: ['b', 'a'] })
  })

  it('normaliza o erro da API', async () => {
    server.use(
      http.post('*/api/trilhas/:id/etapas/:etapaId/concluir', () =>
        HttpResponse.json(
          { message: 'Etapa não encontrada: e1' },
          { status: 404 },
        ),
      ),
    )

    const erro = await concluirEtapa('t1', 'e1').catch(
      (causa: unknown) => causa,
    )

    expect(erro).toBeInstanceOf(EtapaServiceError)
    expect((erro as EtapaServiceError).status).toBe(404)
  })
})
