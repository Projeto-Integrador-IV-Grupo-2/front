import { useContext } from 'react'
import {
  AssistenteContext,
  type AssistenteContextValue,
} from '../contexts/AssistenteContext.tsx'

/** Estado da conversa com o assistente. Só funciona dentro do `AssistenteProvider`. */
export function useAssistente(): AssistenteContextValue {
  const contexto = useContext(AssistenteContext)
  if (!contexto) {
    throw new Error(
      'useAssistente precisa estar dentro de um AssistenteProvider',
    )
  }
  return contexto
}
