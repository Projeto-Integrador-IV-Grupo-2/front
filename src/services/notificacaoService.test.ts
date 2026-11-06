import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { criarNotificacao, criarPagina } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import {
  contarNaoLidas,
  listarNotificacoes,
  marcarComoLida,
  marcarTodasComoLidas,
  NotificacaoServiceError,
  TAMANHO_PAGINA_NOTIFICACOES,
} from './notificacaoService.ts'

describe('notificacaoService', () => {
  it('lista com página, tamanho e o filtro de não lidas só quando pedido', async () => {
    const urls: URL[] = []
    server.use(
      http.get('*/api/notificacoes', ({ request }) => {
        urls.push(new URL(request.url))
        return HttpResponse.json(criarPagina([criarNotificacao()]))
      }),
    )

    const pagina = await listarNotificacoes({ page: 2 })
    await listarNotificacoes({ naoLidas: true, size: 8 })

    expect(pagina.content).toHaveLength(1)
    expect(urls[0].searchParams.get('page')).toBe('2')
    expect(urls[0].searchParams.get('size')).toBe(
      String(TAMANHO_PAGINA_NOTIFICACOES),
    )
    expect(urls[0].searchParams.has('naoLidas')).toBe(false)
    expect(urls[1].searchParams.get('naoLidas')).toBe('true')
    expect(urls[1].searchParams.get('size')).toBe('8')
  })

  it('conta as não lidas', async () => {
    server.use(
      http.get('*/api/notificacoes/nao-lidas/total', () =>
        HttpResponse.json({ total: 12 }),
      ),
    )

    await expect(contarNaoLidas()).resolves.toBe(12)
  })

  it('marca uma e todas como lidas nas rotas certas', async () => {
    const chamadas: string[] = []
    server.use(
      http.patch('*/api/notificacoes/:id/lida', ({ params }) => {
        chamadas.push(`uma:${String(params.id)}`)
        return HttpResponse.json(
          criarNotificacao({ id: String(params.id), lida: true }),
        )
      }),
      http.patch('*/api/notificacoes/lidas', () => {
        chamadas.push('todas')
        return new HttpResponse(null, { status: 204 })
      }),
    )

    const lida = await marcarComoLida('n-1')
    await marcarTodasComoLidas()

    expect(lida.lida).toBe(true)
    expect(chamadas).toEqual(['uma:n-1', 'todas'])
  })

  it('notificação de outra pessoa (404) vira uma mensagem clara', async () => {
    server.use(
      http.patch('*/api/notificacoes/:id/lida', () =>
        HttpResponse.json(
          { message: 'Notificação não encontrada: n-1' },
          { status: 404 },
        ),
      ),
    )

    const erro = await marcarComoLida('n-1').catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(NotificacaoServiceError)
    expect((erro as NotificacaoServiceError).message).toBe(
      'Esta notificação não existe mais.',
    )
    expect((erro as NotificacaoServiceError).status).toBe(404)
  })

  it('erro do servidor não mostra a mensagem técnica', async () => {
    server.use(
      http.get('*/api/notificacoes', () =>
        HttpResponse.json({ message: 'NullPointer' }, { status: 500 }),
      ),
    )

    await expect(listarNotificacoes()).rejects.toThrow(
      expect.objectContaining({ status: 500 }) as Error,
    )
    await expect(listarNotificacoes()).rejects.not.toThrow('NullPointer')
  })
})
