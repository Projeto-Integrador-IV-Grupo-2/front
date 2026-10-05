import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  AtribuicaoServiceError,
  buscarAcompanhamentoDoColaborador,
  exportarAcompanhamento,
  listarAtribuicoes,
} from './atribuicaoService.ts'
import {
  criarAtribuicao,
  criarColaboradorAcompanhamento,
  criarPagina,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'

describe('atribuicaoService', () => {
  it('lista com paginação e ordenação padrão, sem filtros vazios', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/atribuicoes', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(criarPagina([criarAtribuicao()]))
      }),
    )

    const pagina = await listarAtribuicoes({
      trilhaId: '',
      areaId: '',
      status: '',
    })

    const params = url!.searchParams
    expect(params.get('page')).toBe('0')
    expect(params.get('size')).toBe('20')
    expect(params.get('sort')).toBe('usuario.nomeCompleto')
    expect(params.has('trilhaId')).toBe(false)
    expect(params.has('status')).toBe(false)
    expect(pagina.content[0].colaborador.nomeCompleto).toBe('Ana Souza')
  })

  it('envia os filtros combinados', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/atribuicoes', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(criarPagina([]))
      }),
    )

    await listarAtribuicoes(
      { trilhaId: 't-1', areaId: 'a-1', status: 'ATRASADA' },
      { page: 2, size: 10 },
    )

    const params = url!.searchParams
    expect(params.get('trilhaId')).toBe('t-1')
    expect(params.get('areaId')).toBe('a-1')
    expect(params.get('status')).toBe('ATRASADA')
    expect(params.get('page')).toBe('2')
  })

  it('traduz o 403 em mensagem de permissão', async () => {
    server.use(
      http.get(
        '*/api/atribuicoes',
        () => new HttpResponse(null, { status: 403 }),
      ),
    )

    const erro = await listarAtribuicoes().catch((causa: unknown) => causa)

    expect(erro).toBeInstanceOf(AtribuicaoServiceError)
    expect(erro).toMatchObject({
      status: 403,
      message: 'Você não tem permissão para acompanhar as trilhas da equipe.',
    })
  })

  it('não mostra a mensagem técnica de um 500', async () => {
    server.use(
      http.get('*/api/atribuicoes', () =>
        HttpResponse.json({ message: 'NullPointerException' }, { status: 500 }),
      ),
    )

    await expect(listarAtribuicoes()).rejects.toThrow(
      'O servidor não conseguiu concluir a operação.',
    )
  })

  it('busca a visão do colaborador', async () => {
    let caminho = ''
    server.use(
      http.get('*/api/atribuicoes/colaboradores/:usuarioId', ({ params }) => {
        caminho = String(params.usuarioId)
        return HttpResponse.json(criarColaboradorAcompanhamento())
      }),
    )

    const visao = await buscarAcompanhamentoDoColaborador('u-1')

    expect(caminho).toBe('u-1')
    expect(visao.totais.total).toBe(1)
  })

  it('responde 404 do colaborador com texto próprio', async () => {
    server.use(
      http.get('*/api/atribuicoes/colaboradores/:usuarioId', () =>
        HttpResponse.json(
          { message: 'Usuário não encontrado: u-1' },
          { status: 404 },
        ),
      ),
    )

    await expect(buscarAcompanhamentoDoColaborador('u-1')).rejects.toThrow(
      'Colaborador não encontrado.',
    )
  })

  it('exporta o CSV com os filtros e o nome do arquivo da API', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/atribuicoes/exportar', ({ request }) => {
        url = new URL(request.url)
        return new HttpResponse('a;b\n1;2\n', {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="atrasadas.csv"',
          },
        })
      }),
    )

    const arquivo = await exportarAcompanhamento({
      status: 'ATRASADA',
      areaId: 'a-1',
      trilhaId: '',
    })

    const params = url!.searchParams
    expect(params.get('status')).toBe('ATRASADA')
    expect(params.get('areaId')).toBe('a-1')
    expect(params.get('formato')).toBe('csv')
    expect(params.has('trilhaId')).toBe(false)
    expect(arquivo.nome).toBe('atrasadas.csv')
    expect(arquivo.conteudo).toBeInstanceOf(Blob)
    expect(arquivo.conteudo.size).toBe('a;b\n1;2\n'.length)
  })

  it('usa um nome padrão quando a API não expõe o Content-Disposition', async () => {
    server.use(
      http.get(
        '*/api/atribuicoes/exportar',
        () =>
          new HttpResponse('a;b\n', {
            headers: { 'Content-Type': 'text/csv' },
          }),
      ),
    )

    const arquivo = await exportarAcompanhamento()

    expect(arquivo.nome).toMatch(
      /^acompanhamento-trilhas-\d{4}-\d{2}-\d{2}\.csv$/,
    )
  })

  it('lê a mensagem de erro que chega como Blob na exportação', async () => {
    server.use(
      http.get('*/api/atribuicoes/exportar', () =>
        HttpResponse.json(
          { message: 'Formato de exportação não suportado: xls' },
          { status: 400 },
        ),
      ),
    )

    await expect(exportarAcompanhamento()).rejects.toThrow(
      'Formato de exportação não suportado: xls',
    )
  })
})
