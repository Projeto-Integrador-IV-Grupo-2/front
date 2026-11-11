/**
 * Mesma política do `@SenhaForte` da API: 8+ caracteres, com ao menos uma
 * letra maiúscula, uma minúscula e um número. Conferir aqui só poupa uma ida
 * ao servidor — quem decide continua sendo a API.
 */
const POLITICA_MINIMA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

export const REGRA_SENHA =
  'Use ao menos 8 caracteres, com letra maiúscula, minúscula e número.'

/** `null` quando a senha atende à política; senão, o texto para a tela. */
export function validarSenhaForte(senha: string): string | null {
  return POLITICA_MINIMA.test(senha) ? null : REGRA_SENHA
}
