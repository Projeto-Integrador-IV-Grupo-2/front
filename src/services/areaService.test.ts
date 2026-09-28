import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AreaServiceError,
  ativarArea,
  atualizarArea,
  criarArea as cadastrarArea,
  inativarArea,
  listarAreas,
} from './areaService.ts'
import { api } from './api.ts'
import { criarArea, criarPagina } from '../test/factories.ts'

const mockArea = criarArea()

function createAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
}

function createAxiosError(
  status: number,
  message: string,
  fieldErrors?: Array<{ field: string; message: string }>,
): AxiosError {
  const config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', undefined, config, undefined, {
    status,
    statusText: '',
    data: { message, fieldErrors },
    headers: {},
    config,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('listarAreas', () => {
  it('chama GET /api/areas com paginação padrão e devolve a página', async () => {
    const getSpy = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce(createAxiosResponse(criarPagina([mockArea])))

    const resultado = await listarAreas()

    expect(getSpy).toHaveBeenCalledWith('/api/areas', {
      params: { page: 0, size: 20, sort: 'nome' },
      signal: undefined,
    })
    expect(resultado.content).toEqual([mockArea])
  })

  it('só envia o filtro de nome quando ele está preenchido', async () => {
    const getSpy = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce(createAxiosResponse(criarPagina([])))

    await listarAreas({ nome: 'Vendas' }, { page: 1 })

    expect(getSpy).toHaveBeenCalledWith('/api/areas', {
      params: { nome: 'Vendas', page: 1, size: 20, sort: 'nome' },
      signal: undefined,
    })
  })

  it('lança AreaServiceError com mensagem padrão em falha de rede', async () => {
    vi.spyOn(api, 'get').mockRejectedValueOnce(new Error('network down'))

    await expect(listarAreas()).rejects.toMatchObject({
      message: 'Não foi possível carregar as áreas.',
    })
  })
})

describe('criarArea', () => {
  it('chama POST /api/areas e devolve a área criada', async () => {
    const postSpy = vi
      .spyOn(api, 'post')
      .mockResolvedValueOnce(createAxiosResponse(mockArea))

    const resultado = await cadastrarArea({
      nome: mockArea.nome,
      descricao: null,
    })

    expect(postSpy).toHaveBeenCalledWith('/api/areas', {
      nome: mockArea.nome,
      descricao: null,
    })
    expect(resultado).toEqual(mockArea)
  })

  it('lança AreaServiceError com os erros de campo da API', async () => {
    vi.spyOn(api, 'post').mockRejectedValueOnce(
      createAxiosError(400, 'Nome já cadastrado', [
        { field: 'nome', message: 'Já existe uma área com esse nome.' },
      ]),
    )

    const erro: unknown = await cadastrarArea({
      nome: mockArea.nome,
      descricao: null,
    }).catch((caught: unknown) => caught)

    expect(erro).toBeInstanceOf(AreaServiceError)
    expect((erro as AreaServiceError).fieldErrors).toEqual([
      { field: 'nome', message: 'Já existe uma área com esse nome.' },
    ])
  })

  it('usa mensagem própria para 403, mesmo sem corpo na resposta', async () => {
    vi.spyOn(api, 'post').mockRejectedValueOnce(
      createAxiosError(403, undefined as unknown as string),
    )

    await expect(
      cadastrarArea({ nome: mockArea.nome, descricao: null }),
    ).rejects.toMatchObject({
      message: 'Você não tem permissão para esta operação.',
    })
  })
})

describe('atualizarArea', () => {
  it('chama PUT /api/areas/{id} e devolve a área atualizada', async () => {
    const putSpy = vi
      .spyOn(api, 'put')
      .mockResolvedValueOnce(createAxiosResponse(mockArea))

    const resultado = await atualizarArea(mockArea.id, {
      nome: 'Novo nome',
      descricao: 'Nova descrição',
    })

    expect(putSpy).toHaveBeenCalledWith(`/api/areas/${mockArea.id}`, {
      nome: 'Novo nome',
      descricao: 'Nova descrição',
    })
    expect(resultado).toEqual(mockArea)
  })
})

describe('inativarArea / ativarArea', () => {
  it('chama PATCH /api/areas/{id}/inativar', async () => {
    const areaInativa = criarArea({ ativo: false })
    const patchSpy = vi
      .spyOn(api, 'patch')
      .mockResolvedValueOnce(createAxiosResponse(areaInativa))

    const resultado = await inativarArea(mockArea.id)

    expect(patchSpy).toHaveBeenCalledWith(`/api/areas/${mockArea.id}/inativar`)
    expect(resultado.ativo).toBe(false)
  })

  it('chama PATCH /api/areas/{id}/ativar', async () => {
    const patchSpy = vi
      .spyOn(api, 'patch')
      .mockResolvedValueOnce(createAxiosResponse(mockArea))

    await ativarArea(mockArea.id)

    expect(patchSpy).toHaveBeenCalledWith(`/api/areas/${mockArea.id}/ativar`)
  })

  it('bloqueio de vínculo com usuários chega como mensagem de negócio', async () => {
    vi.spyOn(api, 'patch').mockRejectedValueOnce(
      createAxiosError(
        409,
        'Área possui usuários vinculados e não pode ser inativada.',
      ),
    )

    await expect(inativarArea(mockArea.id)).rejects.toMatchObject({
      message: 'Área possui usuários vinculados e não pode ser inativada.',
    })
  })
})
