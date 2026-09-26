/** Formatação de datas das telas de trilhas, sempre em pt-BR. */

const DATA_LONGA: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}

/** Instante com fuso (`OffsetDateTime` da API) em data por extenso. */
export function formatarInstante(valor: string): string {
  return new Date(valor).toLocaleDateString('pt-BR', DATA_LONGA)
}

/**
 * Data sem hora (`LocalDate` da API, ex.: "2026-10-05"). Lida em UTC para o
 * fuso de quem usa não empurrar o dia para trás.
 */
export function formatarData(valor: string): string {
  return new Date(`${valor}T00:00:00Z`).toLocaleDateString('pt-BR', {
    ...DATA_LONGA,
    timeZone: 'UTC',
  })
}
