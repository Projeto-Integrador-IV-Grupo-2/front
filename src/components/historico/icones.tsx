import type { ReactNode } from 'react'

/**
 * Ícones do histórico, com os mesmos traços do protótipo (viewBox 24, linha
 * 1.7). Decorativos: quem precisa de nome usa `aria-label` no botão.
 */
function Icone({
  tamanho = 16,
  children,
}: {
  tamanho?: number
  children: ReactNode
}) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

interface IconeProps {
  tamanho?: number
}

export function IconeBusca({ tamanho }: IconeProps) {
  return (
    <Icone tamanho={tamanho}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Icone>
  )
}

export function IconeFaisca({ tamanho }: IconeProps) {
  return (
    <Icone tamanho={tamanho}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <rect x="7" y="7" width="10" height="10" rx="3" />
    </Icone>
  )
}

export function IconeCodigo({ tamanho }: IconeProps) {
  return (
    <Icone tamanho={tamanho}>
      <path d="M9 18l-5-6 5-6M15 6l5 6-5 6" />
    </Icone>
  )
}

export function IconePlay({ tamanho }: IconeProps) {
  return (
    <Icone tamanho={tamanho}>
      <path d="M8 5v14l11-7z" />
    </Icone>
  )
}

export function IconeCheck({ tamanho }: IconeProps) {
  return (
    <Icone tamanho={tamanho}>
      <path d="M20 6L9 17l-5-5" />
    </Icone>
  )
}

export function IconeLivro({ tamanho }: IconeProps) {
  return (
    <Icone tamanho={tamanho}>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </Icone>
  )
}
