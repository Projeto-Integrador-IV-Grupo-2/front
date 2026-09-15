import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
  UNAUTHORIZED_EVENT,
} from '../services/api.ts'
import {
  fetchCurrentUser,
  login as requestLogin,
} from '../services/authService.ts'
import type { LoginRequest } from '../types/auth.ts'
import type { User } from '../types/user.ts'

export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  /** true enquanto a sessão salva é validada ao carregar a aplicação. */
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<User>
  logout: () => void
}

// Consumida via useAuth() (src/hooks/useAuth.ts), não diretamente.
export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)

interface AuthProviderProps {
  children: ReactNode
}

/** Estado global de autenticação: sessão, usuário logado e login/logout. */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  // Só há o que restaurar se já existir um token salvo de uma sessão anterior.
  const [isLoading, setIsLoading] = useState(() => getStoredToken() !== null)

  useEffect(() => {
    if (!getStoredToken()) {
      return
    }

    let isCancelled = false

    fetchCurrentUser()
      .then((currentUser) => {
        if (!isCancelled) {
          setUser(currentUser)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          clearStoredToken()
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null)
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () =>
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  const login = useCallback(async (credentials: LoginRequest) => {
    const { token, expiraEm, usuario } = await requestLogin(credentials)
    setStoredToken(token, expiraEm)
    setUser(usuario)
    return usuario
  }, [])

  const logout = useCallback(() => {
    clearStoredToken()
    setUser(null)
  }, [])

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
