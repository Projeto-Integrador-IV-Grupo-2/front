import type { User } from '../types/user.ts'
import type { Pagina, Usuario as UsuarioGestao } from '../types/usuario.ts'

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

/**
 * Usuário no formato da gestão (`UsuarioResponse` da API) — mais rico que o
 * `User` da sessão, que só carrega o necessário para autenticar.
 */
export function criarUsuarioGestao(
  overrides: Partial<UsuarioGestao> = {},
): UsuarioGestao {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    nomeCompleto: 'Ana Souza',
    email: 'ana@nexo.com',
    cargo: { id: '22222222-2222-2222-2222-222222222222', nome: 'Analista' },
    area: { id: '33333333-3333-3333-3333-333333333333', nome: 'Tecnologia' },
    papel: 'COLABORADOR',
    situacao: 'ATIVO',
    dataEntrada: '2025-02-10',
    criadoEm: '2025-02-10T12:00:00Z',
    atualizadoEm: '2025-02-10T12:00:00Z',
    ...overrides,
  }
}

/** Página do Spring com os usuários informados. */
export function criarPaginaUsuarios(
  content: UsuarioGestao[] = [criarUsuarioGestao()],
  overrides: Partial<Pagina<UsuarioGestao>['page']> = {},
): Pagina<UsuarioGestao> {
  return {
    content,
    page: {
      size: 10,
      number: 0,
      totalElements: content.length,
      totalPages: 1,
      ...overrides,
    },
  }
}
