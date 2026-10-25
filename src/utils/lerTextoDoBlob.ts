/**
 * Lê um Blob como texto.
 *
 * `Blob.text()` não existe em todo ambiente onde este código roda — o jsdom
 * dos testes é um deles —, então o `FileReader` é o caminho que funciona nos
 * dois. Falha de leitura devolve `undefined` em vez de lançar: quem chama já
 * trata a ausência do texto.
 */
export function lerTextoDoBlob(blob: Blob): Promise<string | undefined> {
  if (typeof blob.text === 'function') {
    return blob.text().catch(() => undefined)
  }
  return new Promise((resolve) => {
    const leitor = new FileReader()
    leitor.onload = () =>
      resolve(typeof leitor.result === 'string' ? leitor.result : undefined)
    leitor.onerror = () => resolve(undefined)
    leitor.readAsText(blob)
  })
}
