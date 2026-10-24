const HORA = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})
const DIA_MES = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
})
const DIA_MES_ANO = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const COMPLETA = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeStyle: 'short',
})

function inicioDoDia(data: Date): number {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime()
}

/**
 * Data curta do histórico: "Hoje, 14:22", "Ontem, 09:12", "12 de set." ou,
 * de outro ano, "12 de set. de 2025".
 */
export function formatarDataConversa(iso: string, agora = new Date()): string {
  const data = new Date(iso)
  const dias = Math.round((inicioDoDia(agora) - inicioDoDia(data)) / 86_400_000)
  if (dias === 0) {
    return `Hoje, ${HORA.format(data)}`
  }
  if (dias === 1) {
    return `Ontem, ${HORA.format(data)}`
  }
  return data.getFullYear() === agora.getFullYear()
    ? DIA_MES.format(data)
    : DIA_MES_ANO.format(data)
}

/** Data por extenso, para o `title`/`dateTime` de quem quer o detalhe. */
export function formatarDataCompleta(iso: string): string {
  return COMPLETA.format(new Date(iso))
}

export function formatarHora(iso: string): string {
  return HORA.format(new Date(iso))
}
