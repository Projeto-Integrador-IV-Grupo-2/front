import { useEffect, useState } from 'react'
import { assinarEventosTrilha } from '../../services/eventosTrilha.ts'
import { listarSugestoes, listarTrilhas } from '../../services/trilhaService.ts'
import type { SugestaoTrilha } from '../../types/trilha.ts'

export interface EstadoSugestoes {
  geradoPorIa: boolean
  aviso: string | null
  sugestoes: SugestaoTrilha[]
}

/**
 * Ids das trilhas que o usuário já começou. A API de sugestões só tira as
 * concluídas; "trilha já iniciada sai da seção" é uma regra da tela, então o
 * hook cruza com as minhas trilhas. Se essa consulta falhar, nada é tirado.
 */
async function idsIniciados(signal: AbortSignal): Promise<Set<string>> {
  try {
    const pagina = await listarTrilhas(
      { minhas: true },
      { page: 0, size: 100, sort: 'prazo' },
      { signal },
    )
    return new Set(
      pagina.content
        .filter(
          (t) => t.progresso != null && t.progresso.status !== 'NAO_INICIADA',
        )
        .map((t) => t.id),
    )
  } catch {
    return new Set()
  }
}

/**
 * Sugestões da IA para a tela de Trilhas. Corre por fora da listagem: enquanto
 * carrega, ou se falhar, devolve `null` — a seção simplesmente não aparece.
 * Trilha iniciada ou inativada (eventos de `eventosTrilha`) sai da lista na hora.
 */
export function useSugestoesTrilhas(): EstadoSugestoes | null {
  const [estado, setEstado] = useState<EstadoSugestoes | null>(null)

  useEffect(() => {
    const controlador = new AbortController()
    listarSugestoes({ signal: controlador.signal })
      .then(async (resposta) => {
        // Só cruza com as minhas trilhas quando há o que filtrar.
        const iniciadas =
          resposta.sugestoes.length > 0
            ? await idsIniciados(controlador.signal)
            : new Set<string>()
        if (!controlador.signal.aborted) {
          setEstado({
            geradoPorIa: resposta.geradoPorIa,
            aviso: resposta.aviso,
            sugestoes: resposta.sugestoes.filter((s) => !iniciadas.has(s.id)),
          })
        }
      })
      .catch(() => {
        // Sugestão é um extra: falhou, a seção some sem atrapalhar a tela.
        if (!controlador.signal.aborted) {
          setEstado(null)
        }
      })
    return () => controlador.abort()
  }, [])

  useEffect(
    () =>
      // Os dois eventos (trilha iniciada e trilha inativada) tiram a trilha
      // das sugestões.
      assinarEventosTrilha((evento) => {
        setEstado((atual) =>
          atual
            ? {
                ...atual,
                sugestoes: atual.sugestoes.filter(
                  (s) => s.id !== evento.trilhaId,
                ),
              }
            : atual,
        )
      }),
    [],
  )

  return estado
}
