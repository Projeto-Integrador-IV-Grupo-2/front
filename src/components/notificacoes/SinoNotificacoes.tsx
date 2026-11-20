import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { Link } from 'react-router-dom'
import type { MarcoDeCarga } from '../../contexts/NotificacoesContext.tsx'
import { useNotificacoes } from '../../hooks/useNotificacoes.ts'
import { ROTAS } from '../../routes/paths.ts'
import {
  listarNotificacoes,
  NotificacaoServiceError,
  TAMANHO_PAINEL_NOTIFICACOES,
} from '../../services/notificacaoService.ts'
import type { Notificacao } from '../../types/notificacao.ts'
import { NotificacaoItem } from './NotificacaoItem.tsx'
import { rotuloDoSino, textoDoSelo } from './rotuloSino.ts'
import { useAbrirNotificacao } from './useAbrirNotificacao.ts'
import styles from './SinoNotificacoes.module.css'

type EstadoLista =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; itens: Notificacao[]; carregadaEm: MarcoDeCarga }

function mensagemDe(causa: unknown): string {
  return causa instanceof NotificacaoServiceError
    ? causa.message
    : 'Não foi possível carregar as notificações.'
}

/**
 * Sino do cabeçalho com o número de não lidas e o painel das mais recentes.
 * O total vem do NotificacoesContext (que também o atualiza de tempos em
 * tempos); a lista é buscada a cada vez que o painel abre.
 */
export function SinoNotificacoes() {
  const { total, atualizarTotal, marcoAtual, estaLida, marcarTodasComoLidas } =
    useNotificacoes()
  const abrirNotificacao = useAbrirNotificacao()
  const painelId = useId()
  const [aberto, setAberto] = useState(false)
  const [lista, setLista] = useState<EstadoLista>({ status: 'carregando' })
  const [marcandoTodas, setMarcandoTodas] = useState(false)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const raizRef = useRef<HTMLDivElement>(null)
  const botaoRef = useRef<HTMLButtonElement>(null)
  const painelRef = useRef<HTMLDivElement>(null)
  const controladorRef = useRef<AbortController | null>(null)

  function carregar() {
    controladorRef.current?.abort()
    const controlador = new AbortController()
    controladorRef.current = controlador
    const carregadaEm = marcoAtual()
    setLista({ status: 'carregando' })
    // O painel é das novidades: só as não lidas. O histórico fica em "Ver todas".
    listarNotificacoes({
      size: TAMANHO_PAINEL_NOTIFICACOES,
      naoLidas: true,
      signal: controlador.signal,
    })
      .then((pagina) => {
        if (!controlador.signal.aborted) {
          setLista({ status: 'pronto', itens: pagina.content, carregadaEm })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setLista({ status: 'erro', mensagem: mensagemDe(causa) })
        }
      })
  }

  function abrir() {
    setAberto(true)
    setErroAcao(null)
    carregar()
    // A lista e o número precisam bater ao abrir.
    atualizarTotal()
  }

  function fechar({ devolverFoco }: { devolverFoco: boolean }) {
    setAberto(false)
    controladorRef.current?.abort()
    if (devolverFoco) {
      botaoRef.current?.focus()
    }
  }

  // O foco entra no painel ao abrir, para o Tab percorrer as notificações.
  useEffect(() => {
    if (aberto) {
      painelRef.current?.focus()
    }
  }, [aberto])

  // Clique fora fecha.
  useEffect(() => {
    if (!aberto) {
      return
    }
    function aoPressionar(evento: PointerEvent) {
      if (!raizRef.current?.contains(evento.target as Node)) {
        setAberto(false)
        controladorRef.current?.abort()
      }
    }
    document.addEventListener('pointerdown', aoPressionar)
    return () => document.removeEventListener('pointerdown', aoPressionar)
  }, [aberto])

  useEffect(() => () => controladorRef.current?.abort(), [])

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (aberto && evento.key === 'Escape') {
      evento.stopPropagation()
      fechar({ devolverFoco: true })
    }
  }

  // Tab para fora do painel fecha (sem puxar o foco de volta).
  function aoPerderFoco(evento: FocusEvent<HTMLDivElement>) {
    const destino = evento.relatedTarget
    if (aberto && destino && !raizRef.current?.contains(destino as Node)) {
      fechar({ devolverFoco: false })
    }
  }

  async function marcarTodas() {
    setMarcandoTodas(true)
    setErroAcao(null)
    try {
      await marcarTodasComoLidas()
    } catch (causa) {
      setErroAcao(
        causa instanceof NotificacaoServiceError
          ? causa.message
          : 'Não foi possível marcar as notificações como lidas.',
      )
    } finally {
      setMarcandoTodas(false)
    }
  }

  function aoAbrirNotificacao(notificacao: Notificacao) {
    if (lista.status !== 'pronto') {
      return
    }
    if (abrirNotificacao(notificacao, lista.carregadaEm)) {
      fechar({ devolverFoco: false })
    }
  }

  const temNaoLidas = total !== null && total > 0

  // Lida some do painel na hora: ao abrir uma, ou todas de uma vez com
  // "Marcar todas como lidas".
  const visiveis =
    lista.status === 'pronto'
      ? lista.itens.filter(
          (notificacao) => !estaLida(notificacao, lista.carregadaEm),
        )
      : []
  return (
    <div
      ref={raizRef}
      className={styles.raiz}
      onKeyDown={aoTeclar}
      onBlur={aoPerderFoco}
    >
      <button
        ref={botaoRef}
        type="button"
        className={styles.sino}
        aria-label={rotuloDoSino(total)}
        aria-expanded={aberto}
        aria-controls={painelId}
        aria-haspopup="dialog"
        title="Notificações"
        onClick={() => (aberto ? fechar({ devolverFoco: false }) : abrir())}
      >
        <IconeSino />
        {temNaoLidas && (
          <span className={styles.selo} aria-hidden="true">
            {textoDoSelo(total)}
          </span>
        )}
      </button>

      {aberto && (
        <div
          ref={painelRef}
          id={painelId}
          role="dialog"
          aria-label="Notificações"
          tabIndex={-1}
          className={styles.painel}
        >
          <div className={styles.cabecalho}>
            <h2 className={styles.titulo}>Notificações</h2>
            <button
              type="button"
              className={styles.acao}
              onClick={() => void marcarTodas()}
              disabled={!temNaoLidas || marcandoTodas}
            >
              {marcandoTodas ? 'Marcando…' : 'Marcar todas como lidas'}
            </button>
          </div>

          {erroAcao && (
            <p className={styles.erroAcao} role="alert">
              {erroAcao}
            </p>
          )}

          <div className={styles.corpo}>
            {lista.status === 'carregando' && (
              <p className={styles.aviso} role="status">
                Carregando notificações…
              </p>
            )}

            {lista.status === 'erro' && (
              <div className={styles.erro} role="alert">
                <p>{lista.mensagem}</p>
                <button type="button" onClick={carregar}>
                  Tentar novamente
                </button>
              </div>
            )}

            {lista.status === 'pronto' && visiveis.length === 0 && (
              <div className={styles.vazio}>
                <p className={styles.vazioTitulo}>Tudo em dia</p>
                <p>Você não tem notificações novas.</p>
              </div>
            )}

            {lista.status === 'pronto' && visiveis.length > 0 && (
              <ul className={styles.lista}>
                {visiveis.map((notificacao) => (
                  <li key={notificacao.id}>
                    <NotificacaoItem
                      notificacao={notificacao}
                      lida={false}
                      onAbrir={aoAbrirNotificacao}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.rodape}>
            <Link
              to={ROTAS.notificacoes}
              className={styles.verTodas}
              onClick={() => fechar({ devolverFoco: false })}
            >
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function IconeSino() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 8a5 5 0 0 1 10 0c0 4 1.5 5 1.5 5h-13S5 12 5 8z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8 15.5a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
