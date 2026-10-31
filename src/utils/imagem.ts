/**
 * Recorta a imagem no centro, em quadrado, e a reduz para `lado` pixels,
 * devolvendo um data URL JPEG. Uma foto de celular (vários MB) vira poucos KB.
 */
export async function reduzirImagemQuadrada(
  arquivo: File,
  lado = 256,
): Promise<string> {
  const bitmap = await createImageBitmap(arquivo)
  try {
    const menor = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = lado
    canvas.height = lado
    const contexto = canvas.getContext('2d')
    if (!contexto) {
      throw new Error('Canvas indisponível')
    }
    contexto.drawImage(
      bitmap,
      (bitmap.width - menor) / 2,
      (bitmap.height - menor) / 2,
      menor,
      menor,
      0,
      0,
      lado,
      lado,
    )
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    bitmap.close()
  }
}
