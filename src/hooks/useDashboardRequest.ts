import { useEffect, useState } from 'react'
import { DashboardServiceError } from '../services/dashboardService.ts'

export type EstadoRequisicaoDashboard<T> =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'sucesso'; dados: T }

/** Busca cancelável para evitar atualizar estado após sair da tela. */
export function useDashboardRequest<T>(
  carregar: (config?: { signal?: AbortSignal }) => Promise<T>,
): EstadoRequisicaoDashboard<T> {
  const [estado, setEstado] = useState<EstadoRequisicaoDashboard<T>>({
    status: 'carregando',
  })

  useEffect(() => {
    const controller = new AbortController()
    let ativo = true
    carregar({ signal: controller.signal })
      .then((dados) => {
        if (ativo) setEstado({ status: 'sucesso', dados })
      })
      .catch((error: unknown) => {
        if (!ativo || controller.signal.aborted) return
        const mensagem =
          error instanceof DashboardServiceError
            ? error.message
            : 'Não foi possível carregar os dados deste painel.'
        setEstado({ status: 'erro', mensagem })
      })

    return () => {
      ativo = false
      controller.abort()
    }
  }, [carregar])

  return estado
}
