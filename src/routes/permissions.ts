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

/**
 * Quem acompanha as trilhas da equipe (tela e exportação). Espelha o
 * `@PreAuthorize` do `AtribuicaoController`: colaborador recebe 403.
 */
export const PERFIS_ACOMPANHAMENTO: UserRole[] = ['ADMIN', 'GESTOR']

export const ITENS_MENU: ItemMenu[] = [
  { to: ROTAS.dashboard, rotulo: 'Visão geral' },
  { to: ROTAS.trilhas, rotulo: 'Trilhas' },
  { to: ROTAS.usuarios, rotulo: 'Usuários', perfis: ['ADMIN'] },
  // Sem `perfis`: a listagem fica visível a qualquer autenticado — só as
  // ações de dentro da tela são restritas (ver PERFIS_GESTAO_AREA).
  { to: ROTAS.areas, rotulo: 'Áreas' },
  // Conteúdos ficam visíveis a todos (colaborador vê só os publicados); criar,
  // editar e publicar são ações internas restritas (ver PERFIS_GESTAO_CONTEUDO).
  { to: ROTAS.conteudos, rotulo: 'Conteúdos' },
  { to: ROTAS.categorias, rotulo: 'Categorias' },
  // Base de documentos da empresa: todos os perfis entram (colaborador vê só
  // os publicados — a API filtra).
  { to: ROTAS.conhecimento, rotulo: 'Conhecimento' },
  {
    to: ROTAS.acompanhamento,
    rotulo: 'Acompanhamento',
    perfis: PERFIS_ACOMPANHAMENTO,
  },
  // O histórico vale para qualquer autenticado: cada um vê as próprias
  // atividades.
  { to: ROTAS.historico, rotulo: 'Histórico' },
]

/**
 * Quem vê a ação "Nova trilha". Segue o protótipo (só o administrador cria);
 * se o backend liberar para gestores, basta incluir `GESTOR` aqui.
 */
export const PERFIS_CRIAR_TRILHA: UserRole[] = ['ADMIN']

/**
 * Quem edita e inativa/reativa uma trilha, no detalhe. Mesmo `@PreAuthorize`
 * de `PUT /api/trilhas/{id}` e dos `PATCH .../inativar` e `.../ativar`:
 * gestor e colaborador recebem 403.
 */
export const PERFIS_GESTAO_TRILHA: UserRole[] = ['ADMIN']

/**
 * Quem atribui uma trilha a colaboradores ou a uma área
 * (`POST /api/trilhas/{id}/atribuicoes`). O gestor atribui, mas não edita.
 */
export const PERFIS_ATRIBUIR_TRILHA: UserRole[] = ['ADMIN', 'GESTOR']

/**
 * Perfis autorizados a criar, editar e inativar/reativar Áreas (Card 14 —
 * controle de acesso, issue #31). Colaborador só visualiza a listagem.
 *
 * As telas de Trilha têm as próprias listas (`PERFIS_CRIAR_TRILHA`,
 * `PERFIS_GESTAO_TRILHA` e `PERFIS_ATRIBUIR_TRILHA` acima), porque lá criar,
 * editar e atribuir não são a mesma permissão. Todas passam pelo hook
 * `usePermissao` e, no fim, pela mesma `temPermissao`: listas diferentes,
 * uma regra só.
 */
export const PERFIS_GESTAO_AREA: UserRole[] = ['ADMIN', 'GESTOR']

/**
 * Quem cria, edita e publica conteúdos e categorias e monta as etapas das
 * trilhas (issue #39). Espelha o `@PreAuthorize` de `/api/conteudos`,
 * `/api/categorias` e `/api/trilhas/{id}/etapas`: colaborador recebe 403.
 */
export const PERFIS_GESTAO_CONTEUDO: UserRole[] = ['ADMIN', 'GESTOR']

/**
 * Quem monta PDIs: vê a aba "PDIs da equipe", abre o editor e usa o botão
 * "Adicionar ao PDI" no detalhe da trilha. Colaborador só vê "Meu PDI".
 */
export const PERFIS_GESTAO_PDI: UserRole[] = ['ADMIN', 'GESTOR']

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
