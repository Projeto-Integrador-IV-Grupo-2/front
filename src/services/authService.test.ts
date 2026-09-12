import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api.ts'
import { AuthError, fetchCurrentUser, login } from './authService.ts'
import type { User } from '../types/user.ts'

const mockUser: User = {
  id: '1',
  name: 'Ana Souza',
  email: 'ana@nexo.com',
  role: 'COLABORADOR',
}

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
  it('chama POST /api/auth/login e retorna token e usuário', async () => {
    const postSpy = vi
      .spyOn(api, 'post')
      .mockResolvedValueOnce(
        createAxiosResponse({ token: 'abc123', user: mockUser }),
      )

    const result = await login({ email: mockUser.email, password: '123456' })

    expect(postSpy).toHaveBeenCalledWith('/api/auth/login', {
      email: mockUser.email,
      password: '123456',
    })
    expect(result).toEqual({ token: 'abc123', user: mockUser })
  })

  it('lança AuthError com a mensagem da API em credenciais inválidas', async () => {
    vi.spyOn(api, 'post').mockRejectedValueOnce(
      createAxiosError(401, 'Credenciais inválidas'),
    )

    await expect(
      login({ email: mockUser.email, password: 'errada' }),
    ).rejects.toMatchObject({ message: 'Credenciais inválidas', status: 401 })
  })

  it('lança AuthError com status 403 para usuário desativado', async () => {
    vi.spyOn(api, 'post').mockRejectedValueOnce(
      createAxiosError(403, 'Usuário desativado'),
    )

    const error: unknown = await login({
      email: mockUser.email,
      password: '123456',
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(AuthError)
    expect((error as AuthError).status).toBe(403)
  })

  it('usa uma mensagem padrão quando a API não retorna erro estruturado', async () => {
    vi.spyOn(api, 'post').mockRejectedValueOnce(new Error('network down'))

    await expect(
      login({ email: mockUser.email, password: '123456' }),
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

    expect(getSpy).toHaveBeenCalledWith('/api/auth/me')
    expect(result).toEqual(mockUser)
  })

  it('lança AuthError quando a sessão não é mais válida', async () => {
    vi.spyOn(api, 'get').mockRejectedValueOnce(
      createAxiosError(401, 'Sessão expirada'),
    )

    await expect(fetchCurrentUser()).rejects.toBeInstanceOf(AuthError)
  })
})
