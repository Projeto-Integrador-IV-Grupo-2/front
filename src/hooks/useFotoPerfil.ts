import { useCallback, useSyncExternalStore } from 'react'
import { lerFoto, observarFotos } from '../services/fotoPerfilService.ts'

/** Foto do usuário (data URL) ou `null`; re-renderiza quando ela muda. */
export function useFotoPerfil(usuarioId: string | undefined): string | null {
  const ler = useCallback(
    () => (usuarioId ? lerFoto(usuarioId) : null),
    [usuarioId],
  )
  return useSyncExternalStore(observarFotos, ler, () => null)
}
