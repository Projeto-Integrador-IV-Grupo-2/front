/**
 * Caminhos das rotas em um lugar só. Router, menu e redirecionamentos usam
 * estas constantes em vez de repetir a string do caminho.
 */
export const ROTAS = {
  login: '/login',
  dashboard: '/dashboard',
  usuarios: '/usuarios',
  trilhas: '/trilhas',
  trilhaDetalhe: '/trilhas/:id',
  areas: '/areas',
} as const

/** Caminho do detalhe de uma trilha específica. */
export function caminhoTrilha(id: string): string {
  return ROTAS.trilhaDetalhe.replace(':id', encodeURIComponent(id))
}
