/** Ids e atributos de acessibilidade dos campos dos formulários do PDI. */

export function idErro(id: string): string {
  return `${id}-erro`
}

/** Atributos de acessibilidade do controle de um `Campo` (Dialogo.tsx). */
export function ariaDoCampo(id: string, erro: string | undefined) {
  return {
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': erro ? idErro(id) : undefined,
  }
}
