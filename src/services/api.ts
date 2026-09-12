import axios, { type InternalAxiosRequestConfig } from 'axios'

const TOKEN_STORAGE_KEY = 'nexo:token'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

/** Disparado no `window` quando a API responde 401, para o AuthContext encerrar a sessão. */
export const UNAUTHORIZED_EVENT = 'nexo:unauthorized'

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
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    clearStoredToken()
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
  return Promise.reject(error)
}

/** Cliente HTTP único do frontend. A URL nunca fica fixa: vem de VITE_API_URL. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use(attachAuthHeader)
api.interceptors.response.use((response) => response, handleResponseError)
