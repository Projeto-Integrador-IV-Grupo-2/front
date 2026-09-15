import axios, { type InternalAxiosRequestConfig } from 'axios'

const TOKEN_STORAGE_KEY = 'nexo:token'
const TOKEN_EXPIRES_KEY = 'nexo:token-expira-em'

/**
 * Lê o token salvo. Se a validade informada no login já passou, descarta a
 * sessão aqui mesmo — assim uma aba reaberta com token vencido não chega a
 * exibir a área autenticada esperando o primeiro 401.
 */
export function getStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!token) {
    return null
  }

  if (isExpired(localStorage.getItem(TOKEN_EXPIRES_KEY))) {
    clearStoredToken()
    return null
  }

  return token
}

export function setStoredToken(token: string, expiraEm?: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
  if (expiraEm) {
    localStorage.setItem(TOKEN_EXPIRES_KEY, expiraEm)
  } else {
    localStorage.removeItem(TOKEN_EXPIRES_KEY)
  }
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(TOKEN_EXPIRES_KEY)
}

function isExpired(expiraEm: string | null): boolean {
  if (!expiraEm) {
    return false
  }
  const instante = Date.parse(expiraEm)
  return !Number.isNaN(instante) && instante <= Date.now()
}

/** Disparado no `window` quando a API responde 401, para o AuthContext encerrar a sessão. */
export const UNAUTHORIZED_EVENT = 'nexo:unauthorized'

/**
 * Disparado no `window` quando a API responde 403. Diferente do 401, a sessão
 * continua válida: o usuário está logado, só não tem permissão para aquilo.
 */
export const FORBIDDEN_EVENT = 'nexo:forbidden'

export function attachAuthHeader(
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig {
  const token = getStoredToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
}

export function handleResponseError(error: unknown): Promise<never> {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status

    if (status === 401) {
      clearStoredToken()
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    } else if (status === 403) {
      // Nunca limpar o token aqui: 403 é falta de permissão, não sessão inválida.
      window.dispatchEvent(new Event(FORBIDDEN_EVENT))
    }
  }
  return Promise.reject(error)
}

/** Cliente HTTP único do frontend. A URL nunca fica fixa: vem de VITE_API_URL. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use(attachAuthHeader)
api.interceptors.response.use((response) => response, handleResponseError)
