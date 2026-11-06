import { describe, expect, it } from 'vitest'
import { TIPOS_NOTIFICACAO } from '../../types/notificacao.ts'
import { tempoRelativo } from '../../utils/tempoRelativo.ts'
import { apresentacaoDe } from './apresentacaoNotificacao.tsx'
import { rotuloDoSino, textoDoSelo } from './rotuloSino.ts'
import { ehRotaInterna } from './useAbrirNotificacao.ts'

describe('apresentacaoDe (Factory Method)', () => {
  it('cada tipo conhecido tem rótulo próprio e ícone', () => {
    const rotulos = TIPOS_NOTIFICACAO.map((tipo) => apresentacaoDe(tipo).rotulo)

    expect(new Set(rotulos).size).toBe(TIPOS_NOTIFICACAO.length)
    expect(rotulos).not.toContain('Notificação')
    TIPOS_NOTIFICACAO.forEach((tipo) => {
      expect(apresentacaoDe(tipo).icone).toBeTruthy()
    })
  })

  it('prazo vencido é perigo e prazo próximo é alerta', () => {
    expect(apresentacaoDe('PRAZO_VENCIDO').tom).toBe('perigo')
    expect(apresentacaoDe('PRAZO_PROXIMO').tom).toBe('alerta')
    expect(apresentacaoDe('TRILHA_CONCLUIDA').tom).toBe('sucesso')
  })

  it('tipo que o front ainda não conhece cai no genérico', () => {
    expect(apresentacaoDe('TIPO_NOVO_DA_API')).toMatchObject({
      rotulo: 'Notificação',
      tom: 'neutro',
    })
  })
})

describe('sino', () => {
  it('acima de 9 mostra "9+"', () => {
    expect(textoDoSelo(1)).toBe('1')
    expect(textoDoSelo(9)).toBe('9')
    expect(textoDoSelo(10)).toBe('9+')
    expect(textoDoSelo(250)).toBe('9+')
  })

  it('o nome do botão traz o total de verdade, mesmo acima de 9', () => {
    expect(rotuloDoSino(null)).toBe('Notificações')
    expect(rotuloDoSino(0)).toBe('Notificações, nenhuma não lida')
    expect(rotuloDoSino(1)).toBe('Notificações, 1 não lida')
    expect(rotuloDoSino(42)).toBe('Notificações, 42 não lidas')
  })
})

describe('ehRotaInterna', () => {
  it('só aceita caminho da própria aplicação', () => {
    expect(ehRotaInterna('/trilhas/1')).toBe(true)
    expect(ehRotaInterna('/acompanhamento')).toBe(true)
    expect(ehRotaInterna(null)).toBe(false)
    expect(ehRotaInterna('//evil.example/x')).toBe(false)
    expect(ehRotaInterna('https://evil.example')).toBe(false)
    expect(ehRotaInterna('javascript:alert(1)')).toBe(false)
  })
})

describe('tempoRelativo', () => {
  const agora = new Date('2026-11-05T12:00:00Z')

  it('fala como gente', () => {
    expect(tempoRelativo('2026-11-05T11:59:40Z', agora)).toBe('agora mesmo')
    expect(tempoRelativo('2026-11-05T11:55:00Z', agora)).toBe('há 5 minutos')
    expect(tempoRelativo('2026-11-05T10:00:00Z', agora)).toBe('há 2 horas')
    expect(tempoRelativo('2026-11-04T11:00:00Z', agora)).toBe('ontem')
    expect(tempoRelativo('2026-11-02T12:00:00Z', agora)).toBe('há 3 dias')
  })

  it('depois de uma semana mostra a data; no futuro, "agora mesmo"', () => {
    expect(tempoRelativo('2026-10-01T12:00:00Z', agora)).toMatch(/2026/)
    expect(tempoRelativo('2026-11-05T12:10:00Z', agora)).toBe('agora mesmo')
    expect(tempoRelativo('não é data', agora)).toBe('')
  })
})
