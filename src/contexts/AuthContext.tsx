import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
  temSessaoSalva,
  UNAUTHORIZED_EVENT,
} from '../services/api.ts'
import {
  fetchCurrentUser,
  login as requestLogin,
} from '../services/authService.ts'
import { PerfilDiferenteError, type LoginRequest } from '../types/auth.ts'
import type { User, UserRole } from '../types/user.ts'

export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  /** true enquanto a sessão salva é validada ao carregar a aplicação. */
  isLoading: boolean
  /**
   * Entra e abre a sessão. Com `perfisPermitidos`, uma conta de outro perfil
   * é recusada com `PerfilDiferenteError` e nada fica salvo.
   */
  login: (
    credentials: LoginRequest,
    perfisPermitidos?: UserRole[],
  ) => Promise<User>
  logout: () => void
  /**
   * Aplica ao usuário da sessão o que a API acabou de gravar (ex.: o nome
   * novo do perfil). Quem lê `user` — o cabeçalho, inclusive — re-renderiza
   * na hora: não há uma segunda cópia do usuário para manter em dia.
   */
  atualizarUsuario: (alteracoes: Partial<User>) => void
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
  // Só há o que restaurar se a sessão anterior existir e ainda valer. A
  // leitura é pura: descartar o token vencido é trabalho do efeito abaixo.
  const [isLoading, setIsLoading] = useState(() => temSessaoSalva())
  // Um login (ou logout) durante a restauração invalida a resposta que ainda
  // está em voo: sem esta marca, o /me antigo falhando limparia o token novo.
  const restauracaoValida = useRef(true)

  useEffect(() => {
    const controller = new AbortController()

    // Token ausente ou vencido: nada a restaurar. A chamada já descarta o
    // vencido, e isLoading nasceu false nesse caso.
    if (!getStoredToken()) {
      return
    }

    fetchCurrentUser({ signal: controller.signal })
      .then((currentUser) => {
        if (restauracaoValida.current) {
          setUser(currentUser)
        }
      })
      .catch(() => {
        // Busca cancelada não é sessão inválida. Em desenvolvimento o
        // StrictMode monta o efeito duas vezes, e o cleanup da primeira
        // montagem aborta esta chamada: tratar isso como falha apagaria um
        // token perfeitamente válido e jogaria quem recarrega a página de
        // volta no login. Quem valeu é a segunda montagem, que busca de novo.
        if (controller.signal.aborted) {
          return
        }
        if (restauracaoValida.current) {
          clearStoredToken()
        }
      })
      .finally(() => {
        // Pelo mesmo motivo: a montagem abortada não decide o carregamento.
        if (controller.signal.aborted) {
          return
        }
        if (restauracaoValida.current) {
          setIsLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    function handleUnauthorized() {
      restauracaoValida.current = false
      setUser(null)
      setIsLoading(false)
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () =>
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  const login = useCallback(
    async (credentials: LoginRequest, perfisPermitidos?: UserRole[]) => {
      const { token, expiraEm, usuario } = await requestLogin(credentials)
      // Conferido antes de guardar o token: a conta de outro perfil não chega
      // a ter sessão aberta, nem por um instante.
      if (perfisPermitidos && !perfisPermitidos.includes(usuario.papel)) {
        throw new PerfilDiferenteError(usuario.papel)
      }
      // A sessão nova manda: qualquer restauração pendente perde a validade e
      // a tela não pode continuar presa no estado de carregando.
      restauracaoValida.current = false
      setStoredToken(token, expiraEm)
      setUser(usuario)
      setIsLoading(false)
      return usuario
    },
    [],
  )

  const logout = useCallback(() => {
    restauracaoValida.current = false
    clearStoredToken()
    setUser(null)
    setIsLoading(false)
  }, [])

  const atualizarUsuario = useCallback((alteracoes: Partial<User>) => {
    setUser((atual) => (atual ? { ...atual, ...alteracoes } : atual))
  }, [])

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
    atualizarUsuario,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
