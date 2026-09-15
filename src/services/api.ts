import axios, { type InternalAxiosRequestConfig } from 'axios'

const TOKEN_STORAGE_KEY = 'nexo:token'
const TOKEN_EXPIRES_KEY = 'nexo:token-expira-em'

/**
 * O acesso ao localStorage é sempre protegido: em navegação privada ou com
 * dados de site bloqueados o próprio `getItem` lança, e uma sessão ausente é
 * uma resposta melhor do que a aplicação inteira não carregar.
 */
function lerItem(chave: string): string | null {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

function gravarItem(chave: string, valor: string | null): void {
  try {
    if (valor === null) {
      localStorage.removeItem(chave)
    } else {
      localStorage.setItem(chave, valor)
    }
  } catch {
    // Sem armazenamento a sessão vale só enquanto a aba estiver aberta.
  }
}

/**
 * Existe sessão salva e ainda válida? Leitura pura: ao contrário de
 * `getStoredToken`, não apaga nada — por isso pode ser usada no render.
 */
export function temSessaoSalva(): boolean {
  return lerItem(TOKEN_STORAGE_KEY) !== null && !tokenVencido()
}

/** Token salvo, ou `null` se não existir ou se a validade já passou. */
export function getStoredToken(): string | null {
  const token = lerItem(TOKEN_STORAGE_KEY)
  if (!token) {
    return null
  }

  if (tokenVencido()) {
    clearStoredToken()
    return null
  }

  return token
}

export function setStoredToken(token: string, expiraEm?: string): void {
  gravarItem(TOKEN_STORAGE_KEY, token)
  gravarItem(TOKEN_EXPIRES_KEY, expiraEm ?? null)
}

export function clearStoredToken(): void {
  gravarItem(TOKEN_STORAGE_KEY, null)
  gravarItem(TOKEN_EXPIRES_KEY, null)
}

/**
 * `expiraEm` precisa ser um instante com fuso (o `Instant` da API sai em UTC,
 * terminado em `Z`). Data sem fuso seria lida como horário local e manteria
 * viva uma sessão já vencida, então valor ilegível conta como vencido: falhar
 * para o lado de pedir login de novo é o lado seguro.
 */
function tokenVencido(): boolean {
  const expiraEm = lerItem(TOKEN_EXPIRES_KEY)
  if (!expiraEm) {
    return false
  }

  const instante = Date.parse(expiraEm)
  if (Number.isNaN(instante) || !temFusoExplicito(expiraEm)) {
    return true
  }

  return instante <= Date.now()
}

function temFusoExplicito(valor: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(valor)
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
  // Só o 401 encerra a sessão. O 403 diz que o usuário está autenticado e não
  // tem permissão para aquilo — quem fez a chamada trata a mensagem na tela.
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
