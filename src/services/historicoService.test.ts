import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  HistoricoServiceError,
  listarHistorico,
  TAMANHO_PAGINA_HISTORICO,
} from './historicoService.ts'
import { criarInteracaoHistorico, criarPagina } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'

describe('historicoService', () => {
  it('pede a página, o tamanho e o mais recente primeiro', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/historico', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(criarPagina([criarInteracaoHistorico()]))
      }),
    )

    const pagina = await listarHistorico(2)

    expect(pagina.content[0].tipo).toBe('TRILHA_INICIADA')
    expect(url!.searchParams.get('page')).toBe('2')
    expect(url!.searchParams.get('size')).toBe(String(TAMANHO_PAGINA_HISTORICO))
    expect(url!.searchParams.get('sort')).toBe('criadoEm,desc')
  })

  it('erro do servidor vira HistoricoServiceError sem a mensagem técnica', async () => {
    server.use(
      http.get('*/api/historico', () =>
        HttpResponse.json({ message: 'NullPointerException' }, { status: 500 }),
      ),
    )

    const erro = await listarHistorico().catch((causa: unknown) => causa)

    expect(erro).toBeInstanceOf(HistoricoServiceError)
    expect((erro as HistoricoServiceError).message).not.toContain('NullPointer')
  })
})
