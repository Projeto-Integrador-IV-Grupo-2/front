import { describe, expect, it } from 'vitest'
import {
  criarFiltroInicial,
  paraFiltroDaApi,
  temFiltroAlterado,
} from './filtroConhecimento.ts'

describe('filtroConhecimento', () => {
  it('o filtro inicial abre nos documentos, sem outros filtros', () => {
    expect(criarFiltroInicial()).toEqual({
      titulo: '',
      categoriaId: '',
      areaId: '',
      tipo: 'DOCUMENTO',
      status: '',
    })
    // Cada chamada devolve um objeto novo: a tela pode mexer sem afetar o próximo.
    expect(criarFiltroInicial()).not.toBe(criarFiltroInicial())
  })

  it('só quem pode filtrar por status o envia para a API', () => {
    const filtro = { ...criarFiltroInicial(), status: 'RASCUNHO' as const }

    expect(paraFiltroDaApi(filtro, true).status).toBe('RASCUNHO')
    expect(paraFiltroDaApi(filtro, false).status).toBe('')
  })

  it('reconhece quando algum filtro saiu do inicial', () => {
    expect(temFiltroAlterado(criarFiltroInicial())).toBe(false)
    expect(
      temFiltroAlterado({ ...criarFiltroInicial(), titulo: 'férias' }),
    ).toBe(true)
    expect(temFiltroAlterado({ ...criarFiltroInicial(), tipo: '' })).toBe(true)
  })
})
