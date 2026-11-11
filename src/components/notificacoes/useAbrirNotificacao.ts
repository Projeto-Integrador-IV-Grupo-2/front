import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MarcoDeCarga } from '../../contexts/NotificacoesContext.tsx'
import { useNotificacoes } from '../../hooks/useNotificacoes.ts'
import type { Notificacao } from '../../types/notificacao.ts'

export function ehRotaInterna(link: string | null): link is string {
  if (link === null) {
    return false
  }
  try {
    return (
      new URL(link, window.location.origin).origin === window.location.origin
    )
  } catch {
    return false
  }
}

/**
 * Clique numa notificação: marca como lida e vai para o link dela. A marcação
 * não segura a navegação (é otimista no contexto); se a API recusar, o
 * contador volta sozinho. Devolve se navegou.
 */
export function useAbrirNotificacao() {
  const navigate = useNavigate()
  const { marcarComoLida } = useNotificacoes()

  return useCallback(
    (notificacao: Notificacao, carregadaEm: MarcoDeCarga): boolean => {
      marcarComoLida(notificacao, carregadaEm).catch(() => {})
      if (!ehRotaInterna(notificacao.link)) {
        return false
      }
      navigate(notificacao.link)
      return true
    },
    [marcarComoLida, navigate],
  )
}
