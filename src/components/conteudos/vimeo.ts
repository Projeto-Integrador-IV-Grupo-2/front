/**
 * Endereço de incorporação de um link do Vimeo, ou `null` se o link não for
 * reconhecido. Só serve para a pré-visualização: quem decide se o vídeo existe
 * é a API, que consulta o oEmbed do Vimeo ao salvar.
 *
 * Aceita `vimeo.com/123`, `vimeo.com/123/hash` (vídeo não listado) e
 * `player.vimeo.com/video/123?h=hash`.
 */
export function urlDeIncorporacao(
  link: string | null | undefined,
): string | null {
  if (!link) {
    return null
  }
  let url: URL
  try {
    url = new URL(link.trim())
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase()
  if (!['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
    return null
  }
  const partes = url.pathname.split('/').filter(Boolean)
  const inicio = host === 'player.vimeo.com' && partes[0] === 'video' ? 1 : 0
  const id = partes[inicio]
  if (!id || !/^\d+$/.test(id)) {
    return null
  }
  const hash = url.searchParams.get('h') ?? partes[inicio + 1]
  const sufixo = hash && /^[\da-f]+$/i.test(hash) ? `?h=${hash}` : ''
  return `https://player.vimeo.com/video/${id}${sufixo}`
}

/** "3 min 05 s" — duração vinda do Vimeo; `null` quando ele não informou. */
export function formatarDuracao(
  segundos: number | null | undefined,
): string | null {
  if (segundos === null || segundos === undefined) {
    return null
  }
  const minutos = Math.floor(segundos / 60)
  const resto = segundos % 60
  if (minutos === 0) {
    return `${resto} s`
  }
  return `${minutos} min ${String(resto).padStart(2, '0')} s`
}
