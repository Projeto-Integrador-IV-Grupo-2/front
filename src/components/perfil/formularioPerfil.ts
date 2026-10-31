import { ROTULOS_PERFIL } from '../../types/usuario.ts'
import type { MeResponse } from '../../types/perfil.ts'

/** Estado do formulário "Dados pessoais": só o nome é editável. */
export interface FormularioPerfil {
  nomeCompleto: string
  /** Campos de leitura, já prontos para exibir. */
  email: string
  papel: string
  area: string
  empresa: string
}

/** Estado do formulário de troca de senha. Vive só na memória do componente. */
export interface FormularioSenha {
  senhaAtual: string
  novaSenha: string
  confirmacao: string
}

export const NAO_INFORMADO = 'Não informado'

/**
 * Fábrica do estado inicial a partir do `MeResponse`: a tela não precisa
 * saber que área e empresa podem faltar na resposta da API.
 */
export function criarFormularioPerfil(me: MeResponse): FormularioPerfil {
  return {
    nomeCompleto: me.nomeCompleto,
    email: me.email,
    papel: ROTULOS_PERFIL[me.papel],
    area: me.area?.nome ?? NAO_INFORMADO,
    empresa: me.empresa?.nome ?? NAO_INFORMADO,
  }
}

export function criarFormularioSenha(): FormularioSenha {
  return { senhaAtual: '', novaSenha: '', confirmacao: '' }
}
