import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FotoPerfilError,
  lerFoto,
  observarFotos,
  removerFoto,
  salvarFoto,
} from './fotoPerfilService.ts'

// jsdom não desenha em canvas: a redução da imagem é trocada por um valor fixo.
vi.mock('../utils/imagem.ts', () => ({
  reduzirImagemQuadrada: vi.fn(async () => 'data:image/jpeg;base64,FOTO'),
}))

function imagem(tipo = 'image/png', tamanho = 10) {
  return new File([new Uint8Array(tamanho)], 'foto', { type: tipo })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fotoPerfilService', () => {
  it('guarda a foto reduzida por usuário e avisa quem observa', async () => {
    const ouvinte = vi.fn()
    const parar = observarFotos(ouvinte)

    await salvarFoto('u1', imagem())

    expect(lerFoto('u1')).toBe('data:image/jpeg;base64,FOTO')
    expect(lerFoto('u2')).toBeNull()
    expect(ouvinte).toHaveBeenCalledTimes(1)

    removerFoto('u1')
    expect(lerFoto('u1')).toBeNull()
    expect(ouvinte).toHaveBeenCalledTimes(2)
    parar()
  })

  it('recusa o que não é imagem aceita', async () => {
    await expect(salvarFoto('u1', imagem('application/pdf'))).rejects.toThrow(
      'Escolha uma imagem JPG, PNG ou WebP.',
    )
  })

  it('recusa imagem acima do limite', async () => {
    await expect(
      salvarFoto('u1', imagem('image/jpeg', 6 * 1024 * 1024)),
    ).rejects.toBeInstanceOf(FotoPerfilError)
    expect(lerFoto('u1')).toBeNull()
  })
})
