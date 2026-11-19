import { describe, expect, it } from 'vitest'
import { formatarDuracao, linkCanonico, urlDeIncorporacao } from './vimeo.ts'

describe('urlDeIncorporacao', () => {
  it('reconhece os formatos de link do Vimeo', () => {
    expect(urlDeIncorporacao('https://vimeo.com/22439234')).toBe(
      'https://player.vimeo.com/video/22439234',
    )
    expect(urlDeIncorporacao('https://vimeo.com/22439234/abc123')).toBe(
      'https://player.vimeo.com/video/22439234?h=abc123',
    )
    expect(urlDeIncorporacao('https://player.vimeo.com/video/1?h=ff')).toBe(
      'https://player.vimeo.com/video/1?h=ff',
    )
  })

  it('reconhece os formatos longos que o oEmbed do Vimeo também aceita', () => {
    expect(
      urlDeIncorporacao('https://vimeo.com/channels/staffpicks/76979871'),
    ).toBe('https://player.vimeo.com/video/76979871')
    expect(urlDeIncorporacao('https://vimeo.com/groups/x/videos/123')).toBe(
      'https://player.vimeo.com/video/123',
    )
    expect(urlDeIncorporacao('https://vimeo.com/showcase/999/video/123')).toBe(
      'https://player.vimeo.com/video/123',
    )
    expect(
      urlDeIncorporacao('https://vimeo.com/channels/staffpicks'),
    ).toBeNull()
  })

  it('ignora o que não é Vimeo', () => {
    expect(urlDeIncorporacao('https://youtube.com/watch?v=1')).toBeNull()
    expect(urlDeIncorporacao('vimeo')).toBeNull()
    expect(urlDeIncorporacao('')).toBeNull()
  })
})

describe('linkCanonico', () => {
  it('devolve o formato curto que o player recebe', () => {
    expect(linkCanonico('https://player.vimeo.com/video/1?h=ff')).toBe(
      'https://vimeo.com/1/ff',
    )
    expect(linkCanonico('https://vimeo.com/channels/staffpicks/76979871')).toBe(
      'https://vimeo.com/76979871',
    )
    expect(linkCanonico('https://exemplo.com/1')).toBeNull()
  })
})

describe('formatarDuracao', () => {
  it('formata minutos e segundos', () => {
    expect(formatarDuracao(185)).toBe('3 min 05 s')
    expect(formatarDuracao(42)).toBe('42 s')
    expect(formatarDuracao(null)).toBeNull()
  })
})
