import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  adicionarCompetencia,
  buscarMeuPdi,
  buscarPdi,
  criarPdi,
  ligarTrilha,
  listarColaboradores,
  listarPdis,
  PdiServiceError,
} from './pdiService.ts'
import {
  criarPagina,
  criarPdiDetalhe,
  criarPdiResumo,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'

const NOVO_PDI = {
  colaboradorId: '00000000-0000-0000-0000-000000000001',
  ciclo: '2026',
  inicio: '2026-01-01',
  fim: '2026-12-31',
}

async function erroDe(promessa: Promise<unknown>): Promise<PdiServiceError> {
  try {
    await promessa
  } catch (causa) {
    expect(causa).toBeInstanceOf(PdiServiceError)
    return causa as PdiServiceError
  }
  throw new Error('a chamada deveria ter falhado')
}

describe('pdiService', () => {
  it('devolve o PDI ativo do usuário', async () => {
    const pdi = await buscarMeuPdi()

    expect(pdi?.ciclo).toBe('2026')
    expect(pdi?.itens[0].competencia.nome).toBe('Comunicação')
  })

  it('sem PDI ativo (404) devolve null em vez de erro', async () => {
    server.use(
      http.get('*/api/pdis/meu', () =>
        HttpResponse.json(
          { message: 'Você não tem PDI ativo' },
          { status: 404 },
        ),
      ),
    )

    await expect(buscarMeuPdi()).resolves.toBeNull()
  })

  it('lista os PDIs do mais recente para o mais antigo', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/pdis', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(criarPagina([criarPdiResumo()]))
      }),
    )

    const pagina = await listarPdis({ page: 1, size: 10 })

    expect(pagina.content).toHaveLength(1)
    expect(url!.searchParams.get('page')).toBe('1')
    expect(url!.searchParams.get('size')).toBe('10')
    expect(url!.searchParams.get('sort')).toBe('criadoEm,desc')
  })

  it('cria o PDI enviando colaborador, ciclo, início e fim', async () => {
    let corpo: unknown = null
    server.use(
      http.post('*/api/pdis', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(criarPdiDetalhe({ itens: [] }), {
          status: 201,
        })
      }),
    )

    await criarPdi(NOVO_PDI)

    expect(corpo).toEqual(NOVO_PDI)
  })

  it('PDI repetido no ciclo traz a mensagem da API', async () => {
    server.use(
      http.post('*/api/pdis', () =>
        HttpResponse.json(
          { message: 'Ana Souza já tem um PDI no ciclo 2026' },
          { status: 409 },
        ),
      ),
    )

    const erro = await erroDe(criarPdi(NOVO_PDI))

    expect(erro.status).toBe(409)
    expect(erro.message).toBe('Ana Souza já tem um PDI no ciclo 2026')
  })

  it('erro de validação traz os campos', async () => {
    server.use(
      http.post('*/api/pdis/:id/itens', () =>
        HttpResponse.json(
          {
            message: 'Falha de validação',
            fieldErrors: [
              {
                field: 'nivelAlvo',
                message: 'nível alvo deve estar entre 1 e 5',
              },
            ],
          },
          { status: 400 },
        ),
      ),
    )

    const erro = await erroDe(
      adicionarCompetencia('pdi-1', {
        competenciaId: 'c-1',
        nivelAtual: 2,
        nivelAlvo: 6,
        observacao: null,
      }),
    )

    expect(erro.fieldErrors).toEqual([
      { field: 'nivelAlvo', message: 'nível alvo deve estar entre 1 e 5' },
    ])
  })

  it('PDI de outra equipe (404) ganha texto próprio', async () => {
    server.use(
      http.get('*/api/pdis/:id', () =>
        HttpResponse.json(
          { message: 'PDI não encontrado: x' },
          { status: 404 },
        ),
      ),
    )

    const erro = await erroDe(buscarPdi('x'))

    expect(erro.message).toMatch(
      /PDI não encontrado\. Ele pode ter sido removido/,
    )
  })

  it('403 sem corpo vira mensagem de permissão', async () => {
    server.use(
      http.get(
        '*/api/pdis/colaboradores',
        () => new HttpResponse(null, { status: 403 }),
      ),
    )

    const erro = await erroDe(listarColaboradores())

    expect(erro.message).toBe('Você não tem permissão para esta operação.')
  })

  it('liga a trilha à competência com tipo TRILHA e prazo', async () => {
    let caminho = ''
    let corpo: unknown = null
    server.use(
      http.post(
        '*/api/pdis/:id/itens/:itemId/acoes',
        async ({ request, params }) => {
          caminho = `${String(params.id)}/${String(params.itemId)}`
          corpo = await request.json()
          return HttpResponse.json({}, { status: 201 })
        },
      ),
    )

    await ligarTrilha('pdi-1', 'item-1', {
      tipo: 'TRILHA',
      trilhaId: 'trilha-1',
      prazo: '2026-11-30',
    })

    expect(caminho).toBe('pdi-1/item-1')
    expect(corpo).toEqual({
      tipo: 'TRILHA',
      trilhaId: 'trilha-1',
      prazo: '2026-11-30',
    })
  })
})
