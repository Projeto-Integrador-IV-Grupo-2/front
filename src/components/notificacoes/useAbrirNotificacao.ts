import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MarcoDeCarga } from '../../contexts/NotificacoesContext.tsx'
import { useNotificacoes } from '../../hooks/useNotificacoes.ts'
import type { Notificacao } from '../../types/notificacao.ts'

/**
 * Só rota interna da aplicação: começa com "/" e não com "//" (que o navegador
 * leria como outro domínio). O link vem da API, mas o front não confia nele
 * para sair do site.
 */
export function ehRotaInterna(link: string | null): link is string {
  return link !== null && link.startsWith('/') && !link.startsWith('//')
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
