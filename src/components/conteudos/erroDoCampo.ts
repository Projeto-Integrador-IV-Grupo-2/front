import type { ApiFieldError } from '../../types/api.ts'

/** Mensagem que a API mandou para um campo do formulário, se houver. */
export function erroDoCampo(
  fieldErrors: ApiFieldError[],
  campo: string,
): string | undefined {
  return fieldErrors.find((erro) => erro.field === campo)?.message
}
