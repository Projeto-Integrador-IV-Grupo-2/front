import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  api,
  attachAuthHeader,
  clearStoredToken,
  getStoredToken,
  handleResponseError,
  setStoredToken,
  UNAUTHORIZED_EVENT,
} from './api.ts'

function createConfig(): InternalAxiosRequestConfig {
  return { headers: new AxiosHeaders() }
}

function createAxiosError(status: number, message: string): AxiosError {
  const config = createConfig()
  const response: AxiosResponse = {
    status,
    statusText: '',
    data: { message },
    headers: {},
    config,
  }
  return new AxiosError(
    'Request failed',
    undefined,
    config,
    undefined,
    response,
  )
}

afterEach(() => {
  clearStoredToken()
})

describe('armazenamento do token', () => {
  it('salva, lê e limpa o token', () => {
    expect(getStoredToken()).toBeNull()

    setStoredToken('abc123')
    expect(getStoredToken()).toBe('abc123')

    clearStoredToken()
    expect(getStoredToken()).toBeNull()
  })
})

describe('attachAuthHeader', () => {
  it('adiciona Authorization: Bearer quando há um token salvo', () => {
    setStoredToken('abc123')

    const config = attachAuthHeader(createConfig())

    expect(config.headers.get('Authorization')).toBe('Bearer abc123')
  })

  it('não adiciona o header quando não há token salvo', () => {
    const config = attachAuthHeader(createConfig())

    expect(config.headers.has('Authorization')).toBe(false)
  })
})

describe('handleResponseError', () => {
  it('encerra a sessão e avisa a aplicação em um 401', async () => {
    setStoredToken('abc123')
    const listener = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)

    await expect(
      handleResponseError(createAxiosError(401, 'Sessão expirada')),
    ).rejects.toBeInstanceOf(AxiosError)

    expect(getStoredToken()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)

    window.removeEventListener(UNAUTHORIZED_EVENT, listener)
  })

  it('mantém a sessão para erros que não são 401', async () => {
    setStoredToken('abc123')
    const listener = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)

    await expect(
      handleResponseError(createAxiosError(500, 'Erro interno')),
    ).rejects.toBeInstanceOf(AxiosError)

    expect(getStoredToken()).toBe('abc123')
    expect(listener).not.toHaveBeenCalled()

    window.removeEventListener(UNAUTHORIZED_EVENT, listener)
  })

  it('rejeita normalmente erros que não vêm do Axios', async () => {
    await expect(
      handleResponseError(new Error('falha de rede')),
    ).rejects.toThrow('falha de rede')
  })
})

describe('api', () => {
  it('usa VITE_API_URL como baseURL, nunca uma URL fixa no código', () => {
    expect(api.defaults.baseURL).toBe(import.meta.env.VITE_API_URL)
  })
})
