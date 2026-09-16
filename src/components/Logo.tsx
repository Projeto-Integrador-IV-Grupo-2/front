interface LogoProps {
  className?: string
}

/** Ícone da marca Nexo — reutilizado no cabeçalho de autenticação e no menu. */
export function LogoIcon({ className }: LogoProps) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <line
        x1="7"
        y1="7"
        x2="21"
        y2="10"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.5"
      />
      <line
        x1="7"
        y1="7"
        x2="12"
        y2="21"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.5"
      />
      <line
        x1="21"
        y1="10"
        x2="12"
        y2="21"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.5"
      />
      <circle cx="7" cy="7" r="3" fill="currentColor" />
      <circle cx="21" cy="10" r="2.2" fill="currentColor" />
      <circle cx="12" cy="21" r="2.6" fill="currentColor" />
    </svg>
  )
}
