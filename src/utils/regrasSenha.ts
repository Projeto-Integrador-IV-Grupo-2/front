/**
 * Regras da senha, uma a uma, para a tela mostrar cada uma enquanto a pessoa
 * digita. É a mesma política do `@SenhaForte` da API (8+ caracteres, com
 * maiúscula, minúscula e número) — conferir aqui só poupa uma ida ao
 * servidor; quem decide continua sendo a API.
 */
export interface RegraSenha {
  id: string
  texto: string
  atende: (senha: string) => boolean
}

export const REGRAS_SENHA: RegraSenha[] = [
  {
    id: 'tamanho',
    texto: 'Ao menos 8 caracteres',
    atende: (senha) => senha.length >= 8,
  },
  {
    id: 'maiuscula',
    texto: 'Uma letra maiúscula',
    atende: (senha) => /[A-Z]/.test(senha),
  },
  {
    id: 'minuscula',
    texto: 'Uma letra minúscula',
    atende: (senha) => /[a-z]/.test(senha),
  },
  { id: 'numero', texto: 'Um número', atende: (senha) => /\d/.test(senha) },
]

/** A senha atende a todas as regras. */
export function senhaAtendeRegras(senha: string): boolean {
  return REGRAS_SENHA.every((regra) => regra.atende(senha))
}
