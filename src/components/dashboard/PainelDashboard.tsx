import type { ReactNode } from 'react'
import styles from './PainelDashboard.module.css'

export type EstadoPainel = 'carregando' | 'erro' | 'vazio' | 'pronto'

interface PainelDashboardProps {
  titulo: string
  estado: EstadoPainel
  mensagemErro?: string
  mensagemVazia?: string
  children: ReactNode
}

/** Cada bloco cuida do próprio estado e não desmonta o restante do painel. */
export function PainelDashboard({
  titulo,
  estado,
  mensagemErro,
  mensagemVazia = 'Ainda não há dados para exibir.',
  children,
}: PainelDashboardProps) {
  return (
    <section
      className={styles.panel}
      aria-busy={estado === 'carregando'}
      aria-labelledby={`painel-${slug(titulo)}`}
    >
      <h3 id={`painel-${slug(titulo)}`} className={styles.title}>
        {titulo}
      </h3>
      {estado === 'carregando' && (
        <p className={styles.state} role="status">
          Carregando…
        </p>
      )}
      {estado === 'erro' && (
        <p className={styles.error} role="alert">
          {mensagemErro ?? 'Não foi possível carregar este bloco.'}
        </p>
      )}
      {estado === 'vazio' && (
        <p className={styles.state} role="status">
          {mensagemVazia}
        </p>
      )}
      {estado === 'pronto' && children}
    </section>
  )
}

function slug(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
