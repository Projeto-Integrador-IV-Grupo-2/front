import { useContext } from 'react'
import {
  NotificacoesContext,
  type NotificacoesContextValue,
} from '../contexts/NotificacoesContext.tsx'

export function useNotificacoes(): NotificacoesContextValue {
  const context = useContext(NotificacoesContext)
  if (!context) {
    throw new Error(
      'useNotificacoes deve ser usado dentro de um NotificacoesProvider',
    )
  }
  return context
}
