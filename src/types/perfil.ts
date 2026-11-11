import type { User } from './user.ts'
import type { RecursoResumo } from './usuario.ts'

/**
 * Dados do usuário logado em `GET /api/auth/me` (record `MeResponse` da API).
 *
 * Área e empresa são opcionais: o `MeResponse` atual só traz id, tenant,
 * nome, e-mail e papel. Quando a API passar a mandá-las, a tela já mostra.
 */
export interface MeResponse extends User {
  empresa?: RecursoResumo | null
}

/** Corpo de `PUT /api/auth/me`: o próprio usuário só muda o nome. */
export interface AtualizarPerfilRequest {
  nomeCompleto: string
}

/** Corpo de `PATCH /api/auth/me/senha`. A confirmação fica só na tela. */
export interface TrocarSenhaRequest {
  senhaAtual: string
  novaSenha: string
}
