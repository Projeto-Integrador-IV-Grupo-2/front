import type { UserRole } from '../types/user.ts'
import { ROTAS } from './paths.ts'

/**
 * Regra de permissão do frontend em um lugar só: rota e menu leem daqui, para
 * a navegação nunca oferecer algo que a rota vai recusar.
 *
 * A autoridade final continua sendo o backend — isto orienta a navegação, não
 * protege dado nenhum.
 */

/** Item de navegação. Sem `perfis`, o item vale para qualquer usuário autenticado. */
export interface ItemMenu {
  to: string
  rotulo: string
  perfis?: UserRole[]
}

export const ITENS_MENU: ItemMenu[] = [
  { to: ROTAS.dashboard, rotulo: 'Visão geral' },
  { to: ROTAS.trilhas, rotulo: 'Trilhas' },
  { to: ROTAS.usuarios, rotulo: 'Usuários', perfis: ['ADMIN'] },
  // Sem `perfis`: a listagem fica visível a qualquer autenticado por ora.
  // Esconder/desabilitar ações por perfil é a issue de controle de acesso
  // (Card 14), ainda não feita.
  { to: ROTAS.areas, rotulo: 'Áreas' },
]

/**
 * Quem vê a ação "Nova trilha". Segue o protótipo (só o administrador cria);
 * se o backend liberar para gestores, basta incluir `GESTOR` aqui.
 */
export const PERFIS_CRIAR_TRILHA: UserRole[] = ['ADMIN']

/** `perfis` indefinido ou vazio = liberado para qualquer perfil autenticado. */
export function temPermissao(
  perfis: UserRole[] | undefined,
  papel: UserRole | undefined,
): boolean {
  if (!perfis || perfis.length === 0) {
    return true
  }
  return papel !== undefined && perfis.includes(papel)
}

export function itensMenuPara(papel: UserRole | undefined): ItemMenu[] {
  return ITENS_MENU.filter((item) => temPermissao(item.perfis, papel))
}
