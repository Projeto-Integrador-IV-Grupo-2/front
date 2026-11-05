import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api.ts'
import {
  AuthError,
  esqueciSenha,
  fetchCurrentUser,
  login,
  redefinirSenha,
} from './authService.ts'
import { criarUsuario } from '../test/factories.ts'

const mockUser = criarUsuario()
const expiraEm = new Date(Date.now() + 60 * 60 * 1000).toISOString()

function createAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
}

function createAxiosError(status: number, message: string): AxiosError {
  const config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', undefined, config, undefined, {
    status,
    statusText: '',
    data: { message },
    headers: {},
    config,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('login', () => {
  it('chama POST /api/auth/login com e-mail e senha e devolve token e usuário', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce(
      createAxiosResponse({
        token: 'abc123',
        tipo: 'Bearer',
        expiraEm,
        usuario: mockUser,
      }),
    )

    const result = await login({ email: mockUser.email, senha: '123456' })

    expect(postSpy).toHaveBeenCalledWith('/api/auth/login', {
      email: mockUser.email,
      senha: '123456',
    })
    expect(result).toEqual({
      token: 'abc123',
      tipo: 'Bearer',
      expiraEm,
      usuario: mockUser,
    })
  })

  it('lança AuthError com a mensagem da API em credenciais inválidas', async () => {
    vi.spyOn(api, 'post').mockRejectedValueOnce(
      createAxiosError(401, 'Credenciais inválidas'),
    )

    await expect(
      login({ email: mockUser.email, senha: 'errada' }),
    ).rejects.toMatchObject({ message: 'Credenciais inválidas', status: 401 })
  })

  it('lança AuthError com status 403 para usuário desativado', async () => {
    vi.spyOn(api, 'post').mockRejectedValueOnce(
      createAxiosError(403, 'Usuário desativado'),
    )

    const error: unknown = await login({
      email: mockUser.email,
      senha: '123456',
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(AuthError)
    expect((error as AuthError).status).toBe(403)
  })

  it('usa uma mensagem padrão quando a API não retorna erro estruturado', async () => {
    vi.spyOn(api, 'post').mockRejectedValueOnce(new Error('network down'))

    await expect(
      login({ email: mockUser.email, senha: '123456' }),
    ).rejects.toMatchObject({
      message: 'Não foi possível entrar. Tente novamente.',
    })
  })
})

describe('fetchCurrentUser', () => {
  it('chama GET /api/auth/me e retorna o usuário logado', async () => {
    const getSpy = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce(createAxiosResponse(mockUser))

    const result = await fetchCurrentUser()

    expect(getSpy).toHaveBeenCalledWith('/api/auth/me', undefined)
    expect(result).toEqual(mockUser)
  })

  it('repassa o AbortSignal, para a restauração poder ser cancelada', async () => {
    const getSpy = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce(createAxiosResponse(mockUser))
    const controller = new AbortController()

    await fetchCurrentUser({ signal: controller.signal })

    expect(getSpy).toHaveBeenCalledWith('/api/auth/me', {
      signal: controller.signal,
    })
  })

  it('lança AuthError quando a sessão não é mais válida', async () => {
    vi.spyOn(api, 'get').mockRejectedValueOnce(
      createAxiosError(401, 'Sessão expirada'),
    )

    await expect(fetchCurrentUser()).rejects.toBeInstanceOf(AuthError)
  })
})

describe('recuperação de senha', () => {
  it('esqueciSenha envia o e-mail para a rota pública', async () => {
    const postSpy = vi
      .spyOn(api, 'post')
      .mockResolvedValueOnce(createAxiosResponse(undefined))

    await esqueciSenha('ana@nexo.com')

    expect(postSpy).toHaveBeenCalledWith('/api/auth/esqueci-senha', {
      email: 'ana@nexo.com',
    })
  })

  it('esqueciSenha normaliza o 429 do limite de pedidos', async () => {
    vi.spyOn(api, 'post').mockRejectedValueOnce(
      createAxiosError(429, 'Muitos pedidos'),
    )

    const erro = await esqueciSenha('ana@nexo.com').catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(AuthError)
    expect((erro as AuthError).status).toBe(429)
  })

  it('redefinirSenha envia token e nova senha e traz os erros de campo', async () => {
    const postSpy = vi.spyOn(api, 'post').mockRejectedValueOnce(
      (() => {
        const erro = createAxiosError(400, 'Falha de validação')
        ;(erro.response!.data as { fieldErrors: unknown }).fieldErrors = [
          { field: 'novaSenha', message: 'senha fraca' },
        ]
        return erro
      })(),
    )

    const erro = await redefinirSenha('tok', 'NovaSenha1').catch(
      (e: unknown) => e,
    )

    expect(postSpy).toHaveBeenCalledWith('/api/auth/redefinir-senha', {
      token: 'tok',
      novaSenha: 'NovaSenha1',
    })
    expect((erro as AuthError).status).toBe(400)
    expect((erro as AuthError).fieldErrors).toEqual([
      { field: 'novaSenha', message: 'senha fraca' },
    ])
  })
})
