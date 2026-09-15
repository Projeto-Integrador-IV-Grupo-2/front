import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import {
  api,
  attachAuthHeader,
  clearStoredToken,
  getStoredToken,
  handleResponseError,
  setStoredToken,
  temSessaoSalva,
  UNAUTHORIZED_EVENT,
} from './api.ts'
import { server } from '../test/msw/server.ts'

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

  it('descarta o token quando a validade informada no login já passou', () => {
    setStoredToken('abc123', new Date(Date.now() - 1000).toISOString())

    expect(getStoredToken()).toBeNull()
  })

  it('trata validade sem fuso como vencida, para não valer horário local', () => {
    // '2099-01-01T00:00:00' seria lido como horário local; sem fuso explícito
    // o valor é inútil e a sessão cai para o lado seguro.
    setStoredToken('abc123', '2099-01-01T00:00:00')

    expect(getStoredToken()).toBeNull()
  })

  it('trata validade ilegível como vencida', () => {
    setStoredToken('abc123', 'qualquer-coisa')

    expect(getStoredToken()).toBeNull()
  })

  it('temSessaoSalva enxerga o token vencido como ausente, sem apagá-lo', () => {
    setStoredToken('abc123', new Date(Date.now() - 1000).toISOString())

    expect(temSessaoSalva()).toBe(false)
    // Leitura pura: quem apaga é getStoredToken, chamado fora do render.
    expect(localStorage.getItem('nexo:token')).toBe('abc123')
  })

  it('mantém o token enquanto a validade não chega', () => {
    setStoredToken('abc123', new Date(Date.now() + 60_000).toISOString())

    expect(getStoredToken()).toBe('abc123')
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

  it('mantém a sessão em um 403', async () => {
    setStoredToken('abc123')
    const semSessao = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, semSessao)

    await expect(
      handleResponseError(createAxiosError(403, 'Acesso negado')),
    ).rejects.toBeInstanceOf(AxiosError)

    // 403 é falta de permissão, não sessão inválida: quem está logado continua logado.
    expect(getStoredToken()).toBe('abc123')
    expect(semSessao).not.toHaveBeenCalled()

    window.removeEventListener(UNAUTHORIZED_EVENT, semSessao)
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

  // Os testes acima chamam os interceptors na mão; estes usam a instância de
  // verdade, então removê-los do `api` faz a suíte falhar.
  it('envia o token salvo no header de uma requisição real', async () => {
    setStoredToken('abc123')
    let recebido: string | null = null
    server.use(
      http.get('*/api/health', ({ request }) => {
        recebido = request.headers.get('Authorization')
        return HttpResponse.json({ status: 'UP' })
      }),
    )

    await api.get('/api/health')

    expect(recebido).toBe('Bearer abc123')
  })

  it('encerra a sessão quando uma requisição real recebe 401', async () => {
    setStoredToken('abc123')
    const semSessao = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, semSessao)
    server.use(
      http.get('*/api/health', () =>
        HttpResponse.json({ message: 'Sessão expirada' }, { status: 401 }),
      ),
    )

    await expect(api.get('/api/health')).rejects.toBeInstanceOf(AxiosError)

    expect(getStoredToken()).toBeNull()
    expect(semSessao).toHaveBeenCalledTimes(1)

    window.removeEventListener(UNAUTHORIZED_EVENT, semSessao)
  })
})
