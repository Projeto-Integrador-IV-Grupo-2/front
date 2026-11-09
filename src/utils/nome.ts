/** Iniciais do primeiro e do último nome: "Ana Maria Souza" → "AS". */
export function iniciais(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
}
