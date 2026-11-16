/**
 * Caminhos das rotas em um lugar só. Router, menu e redirecionamentos usam
 * estas constantes em vez de repetir a string do caminho.
 */
export const ROTAS = {
  login: '/login',
  // Públicas: recuperação de senha (o link do e-mail abre /redefinir-senha?token=...).
  esqueciSenha: '/esqueci-senha',
  redefinirSenha: '/redefinir-senha',
  dashboard: '/dashboard',
  // Fora do menu: o atalho é o "Ver todas" do sino.
  notificacoes: '/notificacoes',
  usuarios: '/usuarios',
  trilhas: '/trilhas',
  trilhaDetalhe: '/trilhas/:id',
  trilhaEstudo: '/trilhas/:id/estudar',
  // Andamento de um colaborador na trilha: aberto pelo "Detalhes" da lista.
  trilhaColaborador: '/trilhas/:id/colaboradores/:atribuicaoId',
  // O PDI vive dentro de Trilhas: sem item próprio no menu.
  pdi: '/trilhas/pdi',
  pdiDetalhe: '/trilhas/pdi/:id',
  areas: '/areas',
  acompanhamento: '/acompanhamento',
  conteudos: '/conteudos',
  // Dentro de Áreas: o item do menu fica marcado nas duas telas.
  categorias: '/areas/categorias',
  conhecimento: '/conhecimento',
  assistente: '/assistente',
  documentoDetalhe: '/conhecimento/:id',
  historico: '/historico',
  // Fora do menu: o atalho é o cartão do usuário, no rodapé da barra lateral.
  perfil: '/perfil',
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

/** Andamento de um colaborador numa trilha: etapas vistas, datas e progresso. */
export function caminhoColaboradorNaTrilha(
  trilhaId: string,
  atribuicaoId: string,
): string {
  return ROTAS.trilhaColaborador
    .replace(':id', encodeURIComponent(trilhaId))
    .replace(':atribuicaoId', encodeURIComponent(atribuicaoId))
}
