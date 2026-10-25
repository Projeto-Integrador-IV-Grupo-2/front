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
  trilhaEstudo: '/trilhas/:id/estudar',
  // O PDI vive dentro de Trilhas: sem item próprio no menu.
  pdi: '/trilhas/pdi',
  pdiDetalhe: '/trilhas/pdi/:id',
  areas: '/areas',
  acompanhamento: '/acompanhamento',
  conteudos: '/conteudos',
  categorias: '/categorias',
  conhecimento: '/conhecimento',
  documentoDetalhe: '/conhecimento/:id',
} as const

/** Caminho do detalhe de uma trilha específica. */
export function caminhoTrilha(id: string): string {
  return ROTAS.trilhaDetalhe.replace(':id', encodeURIComponent(id))
}

/** Tela de estudo de uma trilha: player do Vimeo e conclusão das etapas. */
export function caminhoEstudo(id: string): string {
  return ROTAS.trilhaEstudo.replace(':id', encodeURIComponent(id))
}

/** Detalhe de um documento: arquivos, download e pré-visualização. */
export function caminhoDocumento(id: string): string {
  return ROTAS.documentoDetalhe.replace(':id', encodeURIComponent(id))
}

/** Caminho do editor de um PDI específico. */
export function caminhoPdi(id: string): string {
  return ROTAS.pdiDetalhe.replace(':id', encodeURIComponent(id))
}
