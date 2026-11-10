import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ATE_CELULAR, ATE_TABLET } from '../styles/breakpoints.ts'
import { useTelaAteTablet, useTelaPequena } from './useTelaPequena.ts'

/**
 * `matchMedia` falso que guarda as consultas pedidas e permite disparar a
 * mudança de faixa — é assim que dá para ver o hook reagindo ao navegador
 * (Observer) em vez de medir a janela uma vez só.
 */
function instalarMatchMedia(combina: (query: string) => boolean) {
  const consultas: string[] = []
  const ouvintes = new Set<() => void>()
  let resultado = combina

  vi.stubGlobal('matchMedia', (query: string) => {
    consultas.push(query)
    return {
      get matches() {
        return resultado(query)
      },
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_evento: string, ouvinte: () => void) => {
        ouvintes.add(ouvinte)
      },
      removeEventListener: (_evento: string, ouvinte: () => void) => {
        ouvintes.delete(ouvinte)
      },
      dispatchEvent: () => false,
    } as unknown as MediaQueryList
  })

  return {
    consultas,
    mudarPara(novo: (query: string) => boolean) {
      resultado = novo
      act(() => {
        ouvintes.forEach((ouvinte) => ouvinte())
      })
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useTelaPequena', () => {
  it('pergunta ao navegador pelo breakpoint de celular do projeto', () => {
    const matchMedia = instalarMatchMedia(() => false)

    const { result } = renderHook(() => useTelaPequena())

    expect(matchMedia.consultas).toContain(ATE_CELULAR)
    expect(result.current).toBe(false)
  })

  it('avisa o componente quando a tela entra na faixa de celular', () => {
    const matchMedia = instalarMatchMedia(() => false)
    const { result } = renderHook(() => useTelaPequena())

    matchMedia.mudarPara((query) => query === ATE_CELULAR)

    expect(result.current).toBe(true)
  })

  it('usa a faixa de tablet em useTelaAteTablet', () => {
    const matchMedia = instalarMatchMedia((query) => query === ATE_TABLET)

    const { result } = renderHook(() => useTelaAteTablet())

    expect(matchMedia.consultas).toContain(ATE_TABLET)
    expect(result.current).toBe(true)
  })
})
