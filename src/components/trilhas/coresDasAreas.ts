/** Quantas cores de área a paleta do cartão tem (ver `TrilhaCard`). */
export const CORES_DE_AREA = 10

/**
 * Uma cor por área, na ordem alfabética: áreas diferentes só repetem cor
 * quando há mais áreas que cores na paleta.
 */
export function coresPorArea(
  areas: Array<{ id: string; nome: string }>,
): Map<string, number> {
  const ordenadas = [...areas].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR'),
  )
  return new Map(
    ordenadas.map((area, posicao) => [area.id, posicao % CORES_DE_AREA]),
  )
}

/** Cor de uma área fora da lista (ex.: no assistente): mesmo id, mesma cor. */
export function corPeloId(id: string): number {
  let soma = 0
  for (const caractere of id) {
    soma = (soma * 31 + caractere.charCodeAt(0)) >>> 0
  }
  return soma % CORES_DE_AREA
}
