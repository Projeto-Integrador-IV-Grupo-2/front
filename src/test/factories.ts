import type { User, UserRole } from '../types/user.ts'

const TENANT_PADRAO = '11111111-1111-1111-1111-111111111111'

/** Usuário de teste. Passe só o que o caso precisa distinguir. */
export function criarUsuario(overrides: Partial<User> = {}): User {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    tenantId: TENANT_PADRAO,
    nomeCompleto: 'Ana Souza',
    email: 'ana@nexo.com',
    papel: 'COLABORADOR',
    ...overrides,
  }
}

export function criarUsuarioComPapel(papel: UserRole): User {
  return criarUsuario({ papel })
}
