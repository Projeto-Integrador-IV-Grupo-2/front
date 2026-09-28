import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  criarTrilha,
  listarAreasParaTrilha,
  listarTrilhas,
  TrilhaServiceError,
} from './trilhaService.ts'
import { reiniciarTrilhasMock } from './mocks/trilhasMock.ts'
import { criarPaginaTrilhas, criarTrilhaResumo } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'

const NOVA_TRILHA = {
  nome: 'Excelência em Vendas',
  areaId: null,
  prazoDias: 30,
  objetivos: 'Vender melhor.',
}

describe('trilhaService (API)', () => {
  it('envia paginação e ordenação padrão da listagem', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/trilhas', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(criarPaginaTrilhas())
      }),
    )

    await listarTrilhas()

    const params = url!.searchParams
    expect(params.get('page')).toBe('0')
    expect(params.get('size')).toBe('20')
    expect(params.get('sort')).toBe('nome')
  })

  it('devolve o conteúdo e os contadores da página', async () => {
    server.use(
      http.get('*/api/trilhas', () =>
        HttpResponse.json(
          criarPaginaTrilhas([criarTrilhaResumo()], {
            number: 1,
            totalElements: 13,
            totalPages: 2,
          }),
        ),
      ),
    )

    const pagina = await listarTrilhas({ page: 1, size: 12 })

    expect(pagina.content).toHaveLength(1)
    expect(pagina.page.number).toBe(1)
    expect(pagina.page.totalElements).toBe(13)
  })

  it('envia o corpo do cadastro e preserva os fieldErrors da API', async () => {
    let corpo: unknown = null
    server.use(
      http.post('*/api/trilhas', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(
          {
            message: 'Dados inválidos.',
            fieldErrors: [{ field: 'nome', message: 'nome é obrigatório' }],
          },
          { status: 400 },
        )
      }),
    )

    const erro = await criarTrilha(NOVA_TRILHA).catch((causa: unknown) => causa)

    expect(corpo).toEqual(NOVA_TRILHA)
    expect(erro).toBeInstanceOf(TrilhaServiceError)
    const servico = erro as TrilhaServiceError
    expect(servico.status).toBe(400)
    expect(servico.message).toBe('Dados inválidos.')
    expect(servico.fieldErrors).toEqual([
      { field: 'nome', message: 'nome é obrigatório' },
    ])
  })

  it('troca a mensagem técnica de um 500 por um texto amigável', async () => {
    server.use(
      http.get('*/api/trilhas', () =>
        HttpResponse.json(
          { message: 'NullPointerException at TrilhaService' },
          { status: 500 },
        ),
      ),
    )

    await expect(listarTrilhas()).rejects.toMatchObject({
      status: 500,
      message:
        'O servidor não conseguiu concluir a operação. Tente novamente em instantes.',
    })
  })

  it('usa texto próprio para 403 sem corpo', async () => {
    server.use(
      http.post('*/api/trilhas', () => new HttpResponse(null, { status: 403 })),
    )

    await expect(criarTrilha(NOVA_TRILHA)).rejects.toMatchObject({
      status: 403,
      message: 'Você não tem permissão para esta operação.',
    })
  })

  it('usa o texto padrão quando a rede falha', async () => {
    server.use(http.get('*/api/trilhas', () => HttpResponse.error()))

    await expect(listarTrilhas()).rejects.toMatchObject({
      message: 'Não foi possível carregar as trilhas.',
    })
  })

  it('reduz as áreas a id e nome para o campo do formulário', async () => {
    server.use(
      http.get('*/api/areas', () =>
        HttpResponse.json({
          content: [{ id: 'a1', nome: 'Comercial', ativo: true, extra: 1 }],
          page: { size: 100, number: 0, totalElements: 1, totalPages: 1 },
        }),
      ),
    )

    await expect(listarAreasParaTrilha()).resolves.toEqual([
      { id: 'a1', nome: 'Comercial' },
    ])
  })
})

describe('trilhaService (mock em memória)', () => {
  // O setup dos testes desliga a flag antes de cada caso e a restaura depois.
  beforeEach(() => {
    vi.stubEnv('VITE_TRILHAS_MOCK', 'true')
    reiniciarTrilhasMock()
  })

  // O MSW está com `onUnhandledRequest: 'error'`: se o mock deixasse a
  // chamada escapar para a rede, estes testes falhariam.
  it('responde a listagem sem sair para a rede, ordenada por nome', async () => {
    const pagina = await listarTrilhas({ page: 0, size: 3 })

    expect(pagina.content).toHaveLength(3)
    expect(pagina.page.totalElements).toBe(5)
    expect(pagina.page.totalPages).toBe(2)
    const nomes = pagina.content.map((t) => t.nome)
    expect(nomes).toEqual([...nomes].sort((a, b) => a.localeCompare(b)))
    expect(pagina.content[0].progresso).toBeDefined()
  })

  it('cria a trilha e ela passa a aparecer na listagem', async () => {
    const criada = await criarTrilha(NOVA_TRILHA)
    const pagina = await listarTrilhas({ size: 50 })

    expect(criada.nome).toBe('Excelência em Vendas')
    expect(pagina.content.map((t) => t.nome)).toContain('Excelência em Vendas')
  })

  it('recusa nome repetido com 409, como a API faria', async () => {
    await expect(
      criarTrilha({ ...NOVA_TRILHA, nome: 'onboarding comercial' }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Já existe uma trilha com esse nome.',
    })
  })
})
