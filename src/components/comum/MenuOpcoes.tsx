import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import styles from './MenuOpcoes.module.css'

export interface OpcaoMenu {
  rotulo: string
  aoEscolher: () => void
  /** Ação destrutiva (ex.: desativar): aparece em vermelho. */
  perigo?: boolean
  desabilitada?: boolean
}

interface MenuOpcoesProps {
  /** Nome lido pelo leitor de tela, ex.: "Opções de Ana Souza". */
  rotulo: string
  opcoes: OpcaoMenu[]
}

/**
 * Botão "⋯" que abre a lista de ações de um item. Fecha com Esc (o foco volta
 * ao botão), com clique fora, ao rolar a página ou ao escolher uma opção; as
 * setas andam entre as opções, como no padrão de menu do WAI-ARIA.
 *
 * A lista usa posição fixa, calculada a partir do botão: dentro de tabelas
 * com `overflow: hidden` ela seria cortada se ficasse presa à célula.
 */
export function MenuOpcoes({ rotulo, opcoes }: MenuOpcoesProps) {
  const menuId = useId()
  const botaoRef = useRef<HTMLButtonElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  const [aberto, setAberto] = useState(false)
  const [posicao, setPosicao] = useState({ top: 0, right: 0 })

  useLayoutEffect(() => {
    if (!aberto || !botaoRef.current) return
    const caixa = botaoRef.current.getBoundingClientRect()
    setPosicao({
      top: caixa.bottom + 4,
      right: window.innerWidth - caixa.right,
    })
  }, [aberto])

  // Ao abrir, o foco vai para a primeira opção disponível.
  useEffect(() => {
    if (aberto) {
      listaRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
        ?.focus()
    }
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    function fora(evento: MouseEvent) {
      const alvo = evento.target as Node
      if (
        !listaRef.current?.contains(alvo) &&
        !botaoRef.current?.contains(alvo)
      ) {
        setAberto(false)
      }
    }
    function fechar() {
      setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    return () => {
      document.removeEventListener('mousedown', fora)
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [aberto])

  function itens(): HTMLButtonElement[] {
    return Array.from(
      listaRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ) ?? [],
    )
  }

  function fecharDevolvendoFoco() {
    setAberto(false)
    botaoRef.current?.focus()
  }

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    const lista = itens()
    const atual = lista.indexOf(document.activeElement as HTMLButtonElement)
    if (evento.key === 'Escape' || evento.key === 'Tab') {
      evento.preventDefault()
      fecharDevolvendoFoco()
    } else if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      lista[(atual + 1) % lista.length]?.focus()
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      lista[(atual - 1 + lista.length) % lista.length]?.focus()
    }
  }

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        className={styles.gatilho}
        aria-label={rotulo}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? menuId : undefined}
        onClick={() => setAberto((atual) => !atual)}
      >
        <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="4.5" cy="10" r="1.5" fill="currentColor" />
          <circle cx="10" cy="10" r="1.5" fill="currentColor" />
          <circle cx="15.5" cy="10" r="1.5" fill="currentColor" />
        </svg>
      </button>
      {aberto && (
        <div
          ref={listaRef}
          id={menuId}
          role="menu"
          aria-label={rotulo}
          className={styles.menu}
          style={{ top: posicao.top, right: posicao.right }}
          onKeyDown={aoTeclar}
        >
          {opcoes.map((opcao) => (
            <button
              key={opcao.rotulo}
              type="button"
              role="menuitem"
              className={`${styles.item} ${opcao.perigo ? styles.itemPerigo : ''}`}
              disabled={opcao.desabilitada}
              onClick={() => {
                setAberto(false)
                opcao.aoEscolher()
              }}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
