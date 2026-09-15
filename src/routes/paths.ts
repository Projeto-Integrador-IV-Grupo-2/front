/**
 * Caminhos das rotas em um lugar só. Router, menu e redirecionamentos usam
 * estas constantes em vez de repetir a string do caminho.
 */
export const ROTAS = {
  login: '/login',
  dashboard: '/dashboard',
  usuarios: '/usuarios',
  acessoNegado: '/acesso-negado',
} as const

export type Rota = (typeof ROTAS)[keyof typeof ROTAS]
