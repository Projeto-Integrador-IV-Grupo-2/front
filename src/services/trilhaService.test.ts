import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ativarTrilha,
  atribuirTrilha,
  atualizarProgresso,
  atualizarTrilha,
  buscarTrilha,
  criarTrilha,
  iniciarTrilha,
  inativarTrilha,
  listarAreasParaTrilha,
  listarTrilhas,
  listarTrilhasDaArea,
  listarUsuariosParaAtribuicao,
  TrilhaServiceError,
} from './trilhaService.ts'
import { reiniciarTrilhasMock } from './mocks/trilhasMock.ts'
import {
  criarPaginaTrilhas,
  criarPaginaUsuarios,
  criarProgressoTrilha,
  criarTrilhaDetalhe,
  criarTrilhaResumo,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'

const NOVA_TRILHA = {
  nome: 'Excelência em Vendas',
  descricao: 'Trilha do time comercial.',
  areaId: null,
  prazoDias: 30,
  objetivos: 'Vender melhor.',
}

const ID = '44444444-4444-4444-4444-444444444444'

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

  it('envia os filtros preenchidos e omite os vazios', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/trilhas', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(criarPaginaTrilhas())
      }),
    )

    await listarTrilhas(
      {
        nome: 'vendas',
        areaId: '',
        status: 'EM_ANDAMENTO',
        minhas: true,
        recomendar: undefined,
      },
      { sort: 'prazo' },
    )

    const params = url!.searchParams
    expect(params.get('nome')).toBe('vendas')
    expect(params.get('status')).toBe('EM_ANDAMENTO')
    expect(params.get('minhas')).toBe('true')
    expect(params.get('sort')).toBe('prazo')
    expect(params.has('areaId')).toBe(false)
    expect(params.has('recomendar')).toBe(false)
  })

  it('não envia minhas=false, que é o padrão da API', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/trilhas', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(criarPaginaTrilhas())
      }),
    )

    await listarTrilhas({ minhas: false, recomendar: 'AREA' })

    expect(url!.searchParams.has('minhas')).toBe(false)
    expect(url!.searchParams.get('recomendar')).toBe('AREA')
  })

  it('lista as trilhas de uma área pelo endpoint da área', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/areas/:id/trilhas', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(criarPaginaTrilhas())
      }),
    )

    const pagina = await listarTrilhasDaArea('area 1', { nome: 'on' })

    expect(url!.pathname).toMatch(/\/api\/areas\/area%201\/trilhas$/)
    expect(url!.searchParams.get('nome')).toBe('on')
    expect(pagina.content).toHaveLength(1)
  })

  it('explica o 404 das trilhas da área como área não encontrada', async () => {
    server.use(
      http.get('*/api/areas/:id/trilhas', () =>
        HttpResponse.json(
          { message: 'Área não encontrada: x' },
          { status: 404 },
        ),
      ),
    )

    const erro = await listarTrilhasDaArea('x').catch((causa: unknown) => causa)

    expect(erro).toBeInstanceOf(TrilhaServiceError)
    expect(erro).toMatchObject({
      status: 404,
      message: 'Área não encontrada. Ela pode ter sido removida.',
    })
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

    const pagina = await listarTrilhas({}, { page: 1, size: 12 })

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

  it('troca a mensagem técnica do 404 por uma que serve a quem está na tela', async () => {
    server.use(
      http.get('*/api/trilhas/:id', () =>
        HttpResponse.json(
          { message: 'Trilha não encontrada: 123' },
          { status: 404 },
        ),
      ),
    )

    const erro = await buscarTrilha('123').catch((causa: unknown) => causa)

    expect(erro).toBeInstanceOf(TrilhaServiceError)
    expect(erro).toMatchObject({
      status: 404,
      message:
        'Trilha não encontrada. Ela pode ter sido removida ou não estar disponível para você.',
    })
  })

  it('inicia com POST e atualiza com PATCH no recurso de progresso', async () => {
    const chamadas: string[] = []
    let corpoPatch: unknown = null
    server.use(
      http.post('*/api/trilhas/:id/progresso', ({ params }) => {
        chamadas.push(`POST ${String(params.id)}`)
        return HttpResponse.json(criarProgressoTrilha())
      }),
      http.patch('*/api/trilhas/:id/progresso', async ({ params, request }) => {
        chamadas.push(`PATCH ${String(params.id)}`)
        corpoPatch = await request.json()
        return HttpResponse.json(criarProgressoTrilha({ status: 'CONCLUIDA' }))
      }),
    )

    await iniciarTrilha('t-1')
    const progresso = await atualizarProgresso('t-1', { status: 'CONCLUIDA' })

    expect(chamadas).toEqual(['POST t-1', 'PATCH t-1'])
    expect(corpoPatch).toEqual({ status: 'CONCLUIDA' })
    expect(progresso.status).toBe('CONCLUIDA')
  })

  it('edita a trilha com PUT e devolve o detalhe salvo', async () => {
    let corpo: unknown = null
    server.use(
      http.put('*/api/trilhas/:id', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(
          criarTrilhaDetalhe({ nome: 'Onboarding 2026' }),
        )
      }),
    )

    const detalhe = await atualizarTrilha(ID, {
      ...NOVA_TRILHA,
      nome: 'Onboarding 2026',
    })

    expect(corpo).toEqual({ ...NOVA_TRILHA, nome: 'Onboarding 2026' })
    expect(detalhe.nome).toBe('Onboarding 2026')
  })

  it('devolve a mensagem da API no 409 de nome repetido', async () => {
    server.use(
      http.put('*/api/trilhas/:id', () =>
        HttpResponse.json(
          { message: 'Já existe uma trilha com esse nome.' },
          { status: 409 },
        ),
      ),
    )

    await expect(atualizarTrilha(ID, NOVA_TRILHA)).rejects.toMatchObject({
      status: 409,
      message: 'Já existe uma trilha com esse nome.',
    })
  })

  it('inativa e reativa pelos PATCH correspondentes', async () => {
    const chamadas: string[] = []
    server.use(
      http.patch('*/api/trilhas/:id/inativar', () => {
        chamadas.push('inativar')
        return HttpResponse.json(criarTrilhaDetalhe({ ativo: false }))
      }),
      http.patch('*/api/trilhas/:id/ativar', () => {
        chamadas.push('ativar')
        return HttpResponse.json(criarTrilhaDetalhe({ ativo: true }))
      }),
    )

    expect((await inativarTrilha(ID)).ativo).toBe(false)
    expect((await ativarTrilha(ID)).ativo).toBe(true)
    expect(chamadas).toEqual(['inativar', 'ativar'])
  })

  it('usa o texto de sem permissão no 403 sem corpo da inativação', async () => {
    server.use(
      http.patch(
        '*/api/trilhas/:id/inativar',
        () => new HttpResponse(null, { status: 403 }),
      ),
    )

    await expect(inativarTrilha(ID)).rejects.toMatchObject({
      status: 403,
      message: 'Você não tem permissão para esta operação.',
    })
  })

  it('atribui a colaboradores e devolve quantos foram ignorados', async () => {
    let corpo: unknown = null
    server.use(
      http.post('*/api/trilhas/:id/atribuicoes', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(
          { atribuidos: 2, ignorados: 1 },
          { status: 201 },
        )
      }),
    )

    const resultado = await atribuirTrilha(ID, {
      usuarioIds: ['u-1', 'u-2', 'u-3'],
      prazo: '2026-12-01',
    })

    expect(corpo).toEqual({
      usuarioIds: ['u-1', 'u-2', 'u-3'],
      prazo: '2026-12-01',
    })
    expect(resultado).toEqual({ atribuidos: 2, ignorados: 1 })
  })

  it('atribui a uma área inteira', async () => {
    let corpo: unknown = null
    server.use(
      http.post('*/api/trilhas/:id/atribuicoes', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(
          { atribuidos: 8, ignorados: 0 },
          { status: 201 },
        )
      }),
    )

    await atribuirTrilha(ID, { areaId: 'a-1', prazo: null })

    expect(corpo).toEqual({ areaId: 'a-1', prazo: null })
  })

  it('normaliza o 403 do gestor ao atribuir', async () => {
    server.use(
      http.post('*/api/trilhas/:id/atribuicoes', () =>
        HttpResponse.json(
          { message: 'Acesso negado ao recurso.' },
          { status: 403 },
        ),
      ),
    )

    const erro = await atribuirTrilha(ID, {
      usuarioIds: ['u-1'],
      prazo: null,
    }).catch((causa: unknown) => causa)

    expect(erro).toBeInstanceOf(TrilhaServiceError)
    expect(erro).toMatchObject({
      status: 403,
      message: 'Você não tem permissão para esta operação.',
    })
  })

  it('pede só os colaboradores ativos para o diálogo de atribuição', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/usuarios', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(criarPaginaUsuarios())
      }),
    )

    const lista = await listarUsuariosParaAtribuicao()

    expect(url!.searchParams.get('situacao')).toBe('ATIVO')
    expect(lista).toHaveLength(1)
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
    const pagina = await listarTrilhas({}, { page: 0, size: 3 })

    expect(pagina.content).toHaveLength(3)
    expect(pagina.page.totalElements).toBe(5)
    expect(pagina.page.totalPages).toBe(2)
    const nomes = pagina.content.map((t) => t.nome)
    expect(nomes).toEqual([...nomes].sort((a, b) => a.localeCompare(b)))
    expect(pagina.content[0].progresso).toBeDefined()
  })

  it('cria a trilha e ela passa a aparecer na listagem', async () => {
    const criada = await criarTrilha(NOVA_TRILHA)
    const pagina = await listarTrilhas({}, { size: 50 })

    expect(criada.nome).toBe('Excelência em Vendas')
    expect(pagina.content.map((t) => t.nome)).toContain('Excelência em Vendas')
  })

  it('iniciar e concluir refletem no detalhe e na listagem', async () => {
    const id = 'b1000000-0000-4000-8000-000000000002'
    expect((await buscarTrilha(id)).progresso.status).toBe('NAO_INICIADA')

    await iniciarTrilha(id)
    expect((await buscarTrilha(id)).progresso).toMatchObject({
      status: 'EM_ANDAMENTO',
      percentual: 50,
    })

    await atualizarProgresso(id, { status: 'CONCLUIDA' })
    const pagina = await listarTrilhas({}, { size: 50 })
    const naLista = pagina.content.find((t) => t.id === id)
    expect(naLista?.progresso).toMatchObject({
      status: 'CONCLUIDA',
      percentual: 100,
    })
  })

  it('responde 404 para trilha inexistente e para progresso não iniciado', async () => {
    await expect(buscarTrilha('nao-existe')).rejects.toMatchObject({
      status: 404,
    })
    await expect(
      atualizarProgresso('b1000000-0000-4000-8000-000000000002', {
        status: 'CONCLUIDA',
      }),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('recusa nome repetido com 409, como a API faria', async () => {
    await expect(
      criarTrilha({ ...NOVA_TRILHA, nome: 'onboarding comercial' }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Já existe uma trilha com esse nome.',
    })
  })

  it('edita a trilha e mantém o progresso de quem já a tinha', async () => {
    const id = 'b1000000-0000-4000-8000-000000000001'
    const antes = await buscarTrilha(id)

    const depois = await atualizarTrilha(id, {
      nome: 'Atendimento ao Cliente 2026',
      descricao: 'Nova descrição.',
      areaId: null,
      prazoDias: 45,
      objetivos: 'Atender melhor.',
    })

    expect(depois).toMatchObject({
      nome: 'Atendimento ao Cliente 2026',
      descricao: 'Nova descrição.',
      prazoDias: 45,
      area: null,
    })
    expect(depois.progresso.status).toBe(antes.progresso.status)
  })

  it('recusa com 409 a edição que repete o nome de outra trilha', async () => {
    await expect(
      atualizarTrilha('b1000000-0000-4000-8000-000000000001', {
        nome: 'Onboarding Comercial',
        descricao: null,
        areaId: null,
        prazoDias: null,
        objetivos: null,
      }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('inativar tira a trilha da listagem e reativar devolve', async () => {
    const id = 'b1000000-0000-4000-8000-000000000002'

    await inativarTrilha(id)
    const semEla = await listarTrilhas({}, { size: 50 })
    expect(semEla.content.map((t) => t.id)).not.toContain(id)

    await ativarTrilha(id)
    const comEla = await listarTrilhas({}, { size: 50 })
    expect(comEla.content.map((t) => t.id)).toContain(id)
  })

  it('atribuir de novo não duplica: a segunda vez vem como ignorada', async () => {
    const id = 'b1000000-0000-4000-8000-000000000002'
    const usuarioIds = ['d1000000-0000-4000-8000-000000000001']

    await expect(
      atribuirTrilha(id, { usuarioIds, prazo: null }),
    ).resolves.toEqual({ atribuidos: 1, ignorados: 0 })
    await expect(
      atribuirTrilha(id, { usuarioIds, prazo: null }),
    ).resolves.toEqual({ atribuidos: 0, ignorados: 1 })
  })

  it('marca como atrasada quem passou do prazo sem concluir', async () => {
    // A trilha 4 do mock tem prazo vencido e não foi concluída.
    const atrasada = await buscarTrilha('b1000000-0000-4000-8000-000000000004')
    expect(atrasada.progresso.status).toBe('ATRASADA')

    // A 3 também venceu, mas está concluída: continua concluída.
    const concluida = await buscarTrilha('b1000000-0000-4000-8000-000000000003')
    expect(concluida.progresso.status).toBe('CONCLUIDA')
  })
})
