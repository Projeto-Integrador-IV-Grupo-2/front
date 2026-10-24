import { useCallback, useEffect, useState } from 'react'
import { useAssistente } from '../../hooks/useAssistente.ts'
import {
  apagarSessao,
  listarSessoes,
  renomearSessao,
} from '../../services/assistenteService.ts'
import type { SessaoAssistente } from '../../types/assistente.ts'

interface EstadoHistorico {
  sessoes: SessaoAssistente[]
  /** Última página já carregada (-1 antes da primeira). */
  pagina: number
  temMais: boolean
  carregando: boolean
  carregandoMais: boolean
  erro: string | null
  /** Falha só no "carregar mais": a lista que já está na tela fica. */
  erroMais: string | null
}

const INICIAL: EstadoHistorico = {
  sessoes: [],
  pagina: -1,
  temMais: false,
  carregando: true,
  carregandoMais: false,
  erro: null,
  erroMais: null,
}

function mensagemDe(causa: unknown, padrao: string): string {
  return causa instanceof Error ? causa.message : padrao
}

/** Junta páginas sem repetir: a lista muda enquanto se rola (conversas sobem). */
function semRepetir(
  atuais: SessaoAssistente[],
  novas: SessaoAssistente[],
): SessaoAssistente[] {
  const ids = new Set(atuais.map((s) => s.id))
  return [...atuais, ...novas.filter((s) => !ids.has(s.id))]
}

/**
 * Lista de conversas do painel: paginação, renomear, apagar e — via o canal
 * do assistente (Observer) — a conversa que recebe mensagem sobe para o topo.
 */
export function useHistoricoConversas() {
  const { canal } = useAssistente()
  const [estado, setEstado] = useState<EstadoHistorico>(INICIAL)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    listarSessoes({ page: 0 }, { signal: controlador.signal })
      .then((pagina) => {
        if (controlador.signal.aborted) {
          return
        }
        setEstado((anterior) => ({
          ...anterior,
          // Mantém o que o canal já trouxe enquanto a primeira página chegava.
          sessoes: semRepetir(anterior.sessoes, pagina.content),
          pagina: 0,
          temMais: pagina.page.totalPages > 1,
          carregando: false,
          erro: null,
        }))
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setEstado((anterior) => ({
            ...anterior,
            carregando: false,
            erro: mensagemDe(causa, 'Não foi possível carregar as conversas.'),
          }))
        }
      })
    return () => controlador.abort()
  }, [tentativa])

  useEffect(
    () =>
      canal.assinar((evento) => {
        if (evento.tipo !== 'sessao-atualizada') {
          return
        }
        setEstado((anterior) => ({
          ...anterior,
          sessoes: [
            evento.sessao,
            ...anterior.sessoes.filter((s) => s.id !== evento.sessao.id),
          ],
        }))
      }),
    [canal],
  )

  const tentarDeNovo = useCallback(() => {
    setEstado(INICIAL)
    setTentativa((n) => n + 1)
  }, [])

  const { pagina, temMais, carregandoMais } = estado
  const carregarMais = useCallback(async () => {
    if (!temMais || carregandoMais) {
      return
    }
    setEstado((anterior) => ({
      ...anterior,
      carregandoMais: true,
      erroMais: null,
    }))
    try {
      const proxima = await listarSessoes({ page: pagina + 1 })
      setEstado((anterior) => ({
        ...anterior,
        sessoes: semRepetir(anterior.sessoes, proxima.content),
        pagina: proxima.page.number,
        temMais: proxima.page.number + 1 < proxima.page.totalPages,
        carregandoMais: false,
      }))
    } catch (causa) {
      setEstado((anterior) => ({
        ...anterior,
        carregandoMais: false,
        erroMais: mensagemDe(
          causa,
          'Não foi possível carregar mais conversas.',
        ),
      }))
    }
  }, [carregandoMais, pagina, temMais])

  /** Lança `AssistenteServiceError` para o diálogo mostrar. */
  const renomear = useCallback(async (id: string, titulo: string) => {
    const atualizada = await renomearSessao(id, titulo)
    setEstado((anterior) => ({
      ...anterior,
      sessoes: anterior.sessoes.map((s) => (s.id === id ? atualizada : s)),
    }))
  }, [])

  /** Lança `AssistenteServiceError` para o diálogo mostrar. */
  const apagar = useCallback(async (id: string) => {
    await apagarSessao(id)
    setEstado((anterior) => ({
      ...anterior,
      sessoes: anterior.sessoes.filter((s) => s.id !== id),
    }))
  }, [])

  return { ...estado, carregarMais, tentarDeNovo, renomear, apagar }
}
