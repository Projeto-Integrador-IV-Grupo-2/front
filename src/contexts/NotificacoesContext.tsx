import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../hooks/useAuth.ts'
import {
  contarNaoLidas,
  marcarComoLida as pedirMarcarComoLida,
  marcarTodasComoLidas as pedirMarcarTodas,
} from '../services/notificacaoService.ts'
import type { Notificacao } from '../types/notificacao.ts'

/** De quanto em quanto tempo o contador do sino é atualizado com a aba visível. */
export const INTERVALO_ATUALIZACAO_MS = 60_000

/**
 * "Quando" uma lista foi carregada, para saber se um "marcar todas" posterior
 * vale para ela. Quem carrega uma lista guarda o valor de `marcoAtual()`.
 */
export type MarcoDeCarga = number

export interface NotificacoesContextValue {
  /** Não lidas; `null` enquanto o primeiro total não chegou. */
  total: number | null
  /** Busca o total de novo (ex.: ao abrir o painel). */
  atualizarTotal: () => void
  /** Marco a guardar junto de uma lista recém-pedida. */
  marcoAtual: () => MarcoDeCarga
  /**
   * Se a notificação está lida, juntando o que a API mandou com o que foi
   * marcado depois em qualquer tela (sino ou página).
   */
  estaLida: (notificacao: Notificacao, carregadaEm: MarcoDeCarga) => boolean
  /** Marca uma como lida: o contador cai na hora e volta se a API recusar. */
  marcarComoLida: (
    notificacao: Notificacao,
    carregadaEm: MarcoDeCarga,
  ) => Promise<void>
  /** Marca todas como lidas e zera o contador. */
  marcarTodasComoLidas: () => Promise<void>
}

// Consumido via useNotificacoes() (src/hooks/useNotificacoes.ts), não diretamente.
export const NotificacoesContext = createContext<
  NotificacoesContextValue | undefined
>(undefined)

/**
 * Observer: guarda o total de não lidas e o que foi marcado como lido nesta
 * sessão. O sino e a página `/notificacoes` reagem ao mesmo estado, então
 * marcar como lida num lugar atualiza o outro sem uma nova busca.
 *
 * O total é atualizado a cada {@link INTERVALO_ATUALIZACAO_MS} só com a aba
 * visível: esconder a aba para o intervalo, e voltar a ela busca na hora e
 * recomeça. Deslogar desmonta o layout (e este provider) e encerra tudo.
 */
export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const usuarioId = user?.id
  const [total, setTotal] = useState<number | null>(null)
  const [lidasNaSessao, setLidasNaSessao] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  // Cada "marcar todas" avança o marco: listas carregadas antes dele estão
  // inteiras lidas; as carregadas depois já vêm lidas da API.
  const [marcoTodasLidas, setMarcoTodasLidas] = useState(0)
  const marcoRef = useRef(0)
  // Uma resposta de total que saiu antes de uma marcação chega com o número
  // velho; só a busca mais recente pode escrever.
  const geracaoDoTotal = useRef(0)
  const controladorDoTotal = useRef<AbortController | null>(null)
  const mutacoesEmVoo = useRef(0)

  const buscarTotal = useCallback(() => {
    controladorDoTotal.current?.abort()
    const controlador = new AbortController()
    controladorDoTotal.current = controlador
    const geracao = ++geracaoDoTotal.current
    contarNaoLidas({ signal: controlador.signal })
      .then((novo) => {
        if (geracao === geracaoDoTotal.current && mutacoesEmVoo.current === 0) {
          setTotal(novo)
        }
      })
      // Falha ao atualizar o contador não interrompe a tela: o sino fica com
      // o último número conhecido e a próxima rodada tenta de novo. 401 já é
      // tratado pelo cliente HTTP (encerra a sessão).
      .catch(() => {})
  }, [])

  /** Descarta qualquer total em voo: ele foi pedido antes da marcação. */
  const invalidarTotalEmVoo = useCallback(() => {
    geracaoDoTotal.current++
    controladorDoTotal.current?.abort()
  }, [])

  useEffect(() => {
    if (!usuarioId) {
      return
    }
    let intervalo: ReturnType<typeof setInterval> | undefined

    const iniciar = () => {
      buscarTotal()
      if (intervalo === undefined) {
        intervalo = setInterval(buscarTotal, INTERVALO_ATUALIZACAO_MS)
      }
    }
    const parar = () => {
      clearInterval(intervalo)
      intervalo = undefined
    }
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'hidden') {
        parar()
      } else {
        iniciar()
      }
    }

    if (document.visibilityState !== 'hidden') {
      iniciar()
    }
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    return () => {
      parar()
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      invalidarTotalEmVoo()
    }
  }, [usuarioId, buscarTotal, invalidarTotalEmVoo])

  const marcoAtual = useCallback(() => marcoTodasLidas, [marcoTodasLidas])

  const estaLida = useCallback(
    (notificacao: Notificacao, carregadaEm: MarcoDeCarga) =>
      notificacao.lida ||
      lidasNaSessao.has(notificacao.id) ||
      marcoTodasLidas > carregadaEm,
    [lidasNaSessao, marcoTodasLidas],
  )

  const marcarComoLida = useCallback(
    async (notificacao: Notificacao, carregadaEm: MarcoDeCarga) => {
      if (estaLida(notificacao, carregadaEm)) {
        return
      }
      // Otimista: o clique navega na hora e o sino já mostra o número novo.
      invalidarTotalEmVoo()
      mutacoesEmVoo.current++
      setLidasNaSessao((atual) => new Set(atual).add(notificacao.id))
      setTotal((atual) => (atual === null ? atual : Math.max(0, atual - 1)))
      try {
        await pedirMarcarComoLida(notificacao.id)
      } catch (erro) {
        setLidasNaSessao((atual) => {
          const sem = new Set(atual)
          sem.delete(notificacao.id)
          return sem
        })
        throw erro
      } finally {
        mutacoesEmVoo.current--
        if (mutacoesEmVoo.current === 0) {
          buscarTotal()
        }
      }
    },
    [estaLida, invalidarTotalEmVoo, buscarTotal],
  )

  const marcarTodasComoLidas = useCallback(async () => {
    invalidarTotalEmVoo()
    mutacoesEmVoo.current++
    try {
      await pedirMarcarTodas()
      marcoRef.current += 1
      setMarcoTodasLidas(marcoRef.current)
      setTotal(0)
    } finally {
      mutacoesEmVoo.current--
      if (mutacoesEmVoo.current === 0) {
        buscarTotal()
      }
    }
  }, [invalidarTotalEmVoo, buscarTotal])

  const value = useMemo<NotificacoesContextValue>(
    () => ({
      total,
      atualizarTotal: buscarTotal,
      marcoAtual,
      estaLida,
      marcarComoLida,
      marcarTodasComoLidas,
    }),
    [
      total,
      buscarTotal,
      marcoAtual,
      estaLida,
      marcarComoLida,
      marcarTodasComoLidas,
    ],
  )

  return (
    <NotificacoesContext.Provider value={value}>
      {children}
    </NotificacoesContext.Provider>
  )
}
