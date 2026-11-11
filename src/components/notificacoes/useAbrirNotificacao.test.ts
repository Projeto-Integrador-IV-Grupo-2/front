import { describe, expect, it } from 'vitest'
import { ehRotaInterna } from './useAbrirNotificacao.ts'

describe('ehRotaInterna', () => {
  it('aceita links da aplicação', () => {
    expect(ehRotaInterna('/trilhas/123')).toBe(true)
    expect(ehRotaInterna(`${window.location.origin}/trilhas/123`)).toBe(true)
  })

  it('rejeita links para outros domínios, incluindo barras invertidas', () => {
    expect(ehRotaInterna('//evil.com')).toBe(false)
    expect(ehRotaInterna('/\\evil.com')).toBe(false)
    expect(ehRotaInterna('https://evil.com')).toBe(false)
  })

  it('rejeita link ausente ou inválido', () => {
    expect(ehRotaInterna(null)).toBe(false)
    expect(ehRotaInterna('http://[')).toBe(false)
  })
})
