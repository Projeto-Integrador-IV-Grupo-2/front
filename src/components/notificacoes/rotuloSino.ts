/** O que o sino escreve no selo: acima de 9, "9+". */
export function textoDoSelo(total: number): string {
  return total > 9 ? '9+' : String(total)
}

/** Nome do botão para leitores de tela, sempre com o total. */
export function rotuloDoSino(total: number | null): string {
  if (total === null) {
    return 'Notificações'
  }
  if (total === 0) {
    return 'Notificações, nenhuma não lida'
  }
  return `Notificações, ${total} não ${total === 1 ? 'lida' : 'lidas'}`
}
