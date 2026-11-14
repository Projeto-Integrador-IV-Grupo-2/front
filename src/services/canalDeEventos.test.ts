import { afterEach, describe, expect, it, vi } from 'vitest'
import { criarCanalDeEventos } from './canalDeEventos.ts'
import { assinarEventosTrilha, emitirEventoTrilha } from './eventosTrilha.ts'

describe('criarCanalDeEventos', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('avisa todos os ouvintes e para de avisar quem cancelou', () => {
    const canal = criarCanalDeEventos<number>('teste')
    const primeiro = vi.fn()
    const segundo = vi.fn()
    const cancelar = canal.assinar(primeiro)
    canal.assinar(segundo)

    canal.publicar(1)
    cancelar()
    canal.publicar(2)

    expect(primeiro.mock.calls).toEqual([[1]])
    expect(segundo.mock.calls).toEqual([[1], [2]])
  })

  it('um ouvinte que falha não impede os outros de serem avisados', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const canal = criarCanalDeEventos<string>('teste')
    const depois = vi.fn()
    canal.assinar(() => {
      throw new Error('quebrou')
    })
    canal.assinar(depois)

    expect(() => canal.publicar('evento')).not.toThrow()
    expect(depois).toHaveBeenCalledWith('evento')
    expect(console.error).toHaveBeenCalled()
  })

  it('quem assina durante um aviso só recebe o próximo', () => {
    const canal = criarCanalDeEventos<number>('teste')
    const tardio = vi.fn()
    canal.assinar(() => {
      canal.assinar(tardio)
    })

    canal.publicar(1)
    expect(tardio).not.toHaveBeenCalled()
  })
})

describe('eventosTrilha', () => {
  it('entrega trilha iniciada e trilha inativada a quem assina', () => {
    const ouvinte = vi.fn()
    const cancelar = assinarEventosTrilha(ouvinte)

    emitirEventoTrilha({ tipo: 'trilha-iniciada', trilhaId: 't1' })
    emitirEventoTrilha({ tipo: 'trilha-inativada', trilhaId: 't2' })
    cancelar()

    expect(ouvinte.mock.calls).toEqual([
      [{ tipo: 'trilha-iniciada', trilhaId: 't1' }],
      [{ tipo: 'trilha-inativada', trilhaId: 't2' }],
    ])
  })
})
