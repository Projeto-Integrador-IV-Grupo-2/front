import { reduzirImagemQuadrada } from '../utils/imagem.ts'

/**
 * Foto de perfil. A API ainda não tem onde guardá-la, então ela fica no
 * navegador, uma por usuário: só aparece neste aparelho. Quando o backend
 * ganhar o endpoint, só este service muda — as telas leem pelo
 * `useFotoPerfil` e não sabem onde a foto mora.
 */

export const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp']
export const TAMANHO_MAXIMO_MB = 5

export class FotoPerfilError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FotoPerfilError'
  }
}

const PREFIXO = 'nexo:foto-perfil:'
const ouvintes = new Set<() => void>()

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte())
}

/** Observer: quem mostra a foto (menu, cabeçalho, perfil) se inscreve aqui. */
export function observarFotos(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  // Outra aba trocou a foto: esta acompanha.
  function deOutraAba(evento: StorageEvent) {
    if (evento.key === null || evento.key.startsWith(PREFIXO)) {
      ouvinte()
    }
  }
  window.addEventListener('storage', deOutraAba)
  return () => {
    ouvintes.delete(ouvinte)
    window.removeEventListener('storage', deOutraAba)
  }
}

export function lerFoto(usuarioId: string): string | null {
  try {
    return localStorage.getItem(PREFIXO + usuarioId)
  } catch {
    return null
  }
}

export async function salvarFoto(
  usuarioId: string,
  arquivo: File,
): Promise<string> {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    throw new FotoPerfilError('Escolha uma imagem JPG, PNG ou WebP.')
  }
  if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
    throw new FotoPerfilError(
      `A imagem pode ter no máximo ${TAMANHO_MAXIMO_MB} MB.`,
    )
  }

  let foto: string
  try {
    foto = await reduzirImagemQuadrada(arquivo)
  } catch {
    throw new FotoPerfilError('Não foi possível ler essa imagem.')
  }

  try {
    localStorage.setItem(PREFIXO + usuarioId, foto)
  } catch {
    throw new FotoPerfilError(
      'O navegador não deixou guardar a foto. Verifique se o armazenamento do site está liberado.',
    )
  }
  avisar()
  return foto
}

export function removerFoto(usuarioId: string): void {
  try {
    localStorage.removeItem(PREFIXO + usuarioId)
  } catch {
    // Sem armazenamento não havia foto guardada.
  }
  avisar()
}
