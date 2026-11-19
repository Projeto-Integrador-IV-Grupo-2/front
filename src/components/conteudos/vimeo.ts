interface VideoDoVimeo {
  id: string
  /** `h` dos vídeos não listados; `null` nos públicos. */
  hash: string | null
}

const HOSTS_DO_VIMEO = ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']

/**
 * Id (e hash, se houver) de um link do Vimeo, ou `null` se o link não for
 * reconhecido.
 *
 * Aceita os formatos que o oEmbed do Vimeo aceita: `vimeo.com/123`,
 * `vimeo.com/123/hash` (vídeo não listado), `player.vimeo.com/video/123?h=hash`,
 * `vimeo.com/channels/x/123`, `vimeo.com/groups/x/videos/123` e
 * `vimeo.com/showcase/9/video/123`. A API já grava o formato curto, mas
 * conteúdos antigos podem ter qualquer um deles.
 */
function videoDoLink(link: string | null | undefined): VideoDoVimeo | null {
  if (!link) {
    return null
  }
  let url: URL
  try {
    url = new URL(link.trim())
  } catch {
    return null
  }
  if (!HOSTS_DO_VIMEO.includes(url.hostname.toLowerCase())) {
    return null
  }
  const partes = url.pathname.split('/').filter(Boolean)
  const numerico = (parte: string | undefined) =>
    parte !== undefined && /^\d+$/.test(parte)
  // Depois de `video`/`videos` vem o id; sem isso, vale o último trecho numérico.
  const marcador = partes.findIndex((p) => p === 'video' || p === 'videos')
  let posicao = -1
  if (marcador >= 0 && numerico(partes[marcador + 1])) {
    posicao = marcador + 1
  } else {
    for (let i = partes.length - 1; i >= 0; i -= 1) {
      if (numerico(partes[i])) {
        posicao = i
        break
      }
    }
  }
  if (posicao < 0) {
    return null
  }
  const candidato = url.searchParams.get('h') ?? partes[posicao + 1]
  const hash = candidato && /^[\da-f]+$/i.test(candidato) ? candidato : null
  return { id: partes[posicao], hash }
}

/**
 * Endereço de incorporação (`player.vimeo.com/video/...`) de um link do
 * Vimeo, ou `null` se o link não for reconhecido. Quem decide se o vídeo
 * existe é a API, que consulta o oEmbed do Vimeo ao salvar.
 */
export function urlDeIncorporacao(
  link: string | null | undefined,
): string | null {
  const video = videoDoLink(link)
  if (!video) {
    return null
  }
  return `https://player.vimeo.com/video/${video.id}${video.hash ? `?h=${video.hash}` : ''}`
}

/**
 * O link no formato `https://vimeo.com/{id}[/{hash}]`, o único que o player
 * (`@vimeo/player`) precisa receber; `null` se o link não for reconhecido.
 */
export function linkCanonico(link: string | null | undefined): string | null {
  const video = videoDoLink(link)
  if (!video) {
    return null
  }
  return `https://vimeo.com/${video.id}${video.hash ? `/${video.hash}` : ''}`
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
