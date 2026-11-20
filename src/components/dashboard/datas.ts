/** Datas `AAAA-MM-DD` da API (prazos), lidas no fuso local. */
export function lerData(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null
  const [ano, mes, dia] = valor.split('-').map(Number)
  const data = new Date(ano, mes - 1, dia)
  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return null
  }
  return data
}

export function formatarData(valor: string): string {
  const data = lerData(valor)
  if (!data) return 'Data indisponível'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(data)
}

/** Dias corridos desde o prazo até hoje; zero se ainda não venceu. */
export function diasDeAtraso(prazo: string, hoje = new Date()): number {
  const data = lerData(prazo)
  if (!data) return 0
  const inicioDeHoje = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate(),
  )
  const dias = Math.round((inicioDeHoje.getTime() - data.getTime()) / 86400000)
  return Math.max(0, dias)
}

/** "venceu hoje", "1 dia de atraso", "5 dias de atraso". */
export function textoDoAtraso(prazo: string | null): string {
  if (!prazo) return 'Atrasada'
  const dias = diasDeAtraso(prazo)
  if (dias === 0) return 'Venceu hoje'
  return `${dias} ${dias === 1 ? 'dia' : 'dias'} de atraso`
}

export function plural(
  valor: number,
  singular: string,
  varios: string,
): string {
  return valor === 1 ? singular : varios
}
