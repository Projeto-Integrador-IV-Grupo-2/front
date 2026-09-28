import { useAuth } from './useAuth.ts'
import { temPermissao } from '../routes/permissions.ts'
import type { UserRole } from '../types/user.ts'

/**
 * Hook único de checagem de perfil para uso dentro de componentes (esconder
 * ou desabilitar uma ação) — mesma regra `temPermissao` que já protege rotas
 * em `ProtectedRoute`, só que para o que fica dentro de uma tela liberada.
 *
 * Só orienta a interface: a autorização de verdade continua no
 * `@PreAuthorize` do backend. Qualquer 401/403 que passar por aqui ainda
 * precisa ser tratado pela tela — ver `AreaServiceError`/`UsuarioServiceError`.
 */
export function usePermissao(perfis: UserRole[]): boolean {
  const { user } = useAuth()
  return temPermissao(perfis, user?.papel)
}
