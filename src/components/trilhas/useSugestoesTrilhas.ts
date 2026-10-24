import { useEffect, useState } from 'react'
import { assinarEventosTrilha } from '../../services/eventosTrilha.ts'
import { listarSugestoes } from '../../services/trilhaService.ts'
import type { OrigemSugestao, SugestaoTrilha } from '../../types/trilha.ts'

export interface EstadoSugestoes {
  origem: OrigemSugestao
  sugestoes: SugestaoTrilha[]
}

function naoIniciada({ trilha }: SugestaoTrilha): boolean {
  return trilha.progresso == null || trilha.progresso.status === 'NAO_INICIADA'
}

/**
 * Sugestões da IA para a tela de Trilhas. Corre por fora da listagem: enquanto
 * carrega, ou se falhar, devolve `null` — a seção simplesmente não aparece.
 * Trilha iniciada (evento do `trilhaService`) sai da lista na hora.
 */
export function useSugestoesTrilhas(): EstadoSugestoes | null {
  const [estado, setEstado] = useState<EstadoSugestoes | null>(null)

  useEffect(() => {
    const controlador = new AbortController()
    listarSugestoes({ signal: controlador.signal })
      .then((resposta) => {
        if (!controlador.signal.aborted) {
          setEstado({
            origem: resposta.origem,
            sugestoes: resposta.sugestoes.filter(naoIniciada),
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
      assinarEventosTrilha((evento) => {
        if (evento.tipo !== 'trilha-iniciada') {
          return
        }
        setEstado((atual) =>
          atual
            ? {
                ...atual,
                sugestoes: atual.sugestoes.filter(
                  (s) => s.trilha.id !== evento.trilhaId,
                ),
              }
            : atual,
        )
      }),
    [],
  )

  return estado
}
