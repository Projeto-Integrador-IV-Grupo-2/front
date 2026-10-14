import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  ConteudoServiceError,
  criarConteudo as cadastrarConteudo,
  listarConteudos,
  publicarConteudo,
} from './conteudoService.ts'
import { criarConteudo, criarPagina } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'

describe('conteudoService', () => {
  it('envia só os filtros preenchidos', async () => {
    let url = ''
    server.use(
      http.get('*/api/conteudos', ({ request }) => {
        url = request.url
        return HttpResponse.json(criarPagina([criarConteudo()]))
      }),
    )

    const pagina = await listarConteudos({
      tipo: 'VIDEO',
      areaId: '',
      titulo: 'Boas',
    })

    expect(pagina.content).toHaveLength(1)
    expect(url).toContain('tipo=VIDEO')
    expect(url).toContain('titulo=Boas')
    expect(url).not.toContain('areaId')
  })

  it('devolve o erro do Vimeo no campo videoUrl', async () => {
    server.use(
      http.post('*/api/conteudos', () =>
        HttpResponse.json(
          {
            status: 400,
            message: 'Vídeo não encontrado no Vimeo',
            fieldErrors: [
              { field: 'videoUrl', message: 'Vídeo não encontrado no Vimeo' },
            ],
          },
          { status: 400 },
        ),
      ),
    )

    const erro = await cadastrarConteudo({
      titulo: 'X',
      descricao: null,
      tipo: 'VIDEO',
      categoriaId: null,
      areaId: null,
      videoUrl: 'https://vimeo.com/1',
      corpo: null,
      linkUrl: null,
    }).catch((causa: unknown) => causa)

    expect(erro).toBeInstanceOf(ConteudoServiceError)
    expect((erro as ConteudoServiceError).status).toBe(400)
    expect((erro as ConteudoServiceError).fieldErrors).toEqual([
      { field: 'videoUrl', message: 'Vídeo não encontrado no Vimeo' },
    ])
  })

  it('traduz o 403 sem corpo em mensagem de permissão', async () => {
    server.use(
      http.patch(
        '*/api/conteudos/:id/publicar',
        () => new HttpResponse(null, { status: 403 }),
      ),
    )

    await expect(publicarConteudo('1')).rejects.toMatchObject({
      status: 403,
      message: 'Você não tem permissão para esta operação.',
    })
  })
})
