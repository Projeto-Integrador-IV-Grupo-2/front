const RELATIVO = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
const DATA = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const MINUTO = 60_000
const HORA = 60 * MINUTO
const DIA = 24 * HORA

/**
 * "agora mesmo", "há 5 minutos", "há 2 horas", "ontem", "há 3 dias". Depois de
 * uma semana, a data ("5 de nov. de 2026"), que diz mais que "há 5 semanas".
 * Data no futuro (relógio do aparelho atrasado) conta como "agora mesmo".
 */
export function tempoRelativo(iso: string, agora: Date = new Date()): string {
  const instante = new Date(iso)
  const passou = agora.getTime() - instante.getTime()
  if (Number.isNaN(passou)) {
    return ''
  }
  if (passou < MINUTO) {
    return 'agora mesmo'
  }
  if (passou < HORA) {
    return RELATIVO.format(-Math.floor(passou / MINUTO), 'minute')
  }
  if (passou < DIA) {
    return RELATIVO.format(-Math.floor(passou / HORA), 'hour')
  }
  if (passou < 7 * DIA) {
    return RELATIVO.format(-Math.floor(passou / DIA), 'day')
  }
  return DATA.format(instante)
}
