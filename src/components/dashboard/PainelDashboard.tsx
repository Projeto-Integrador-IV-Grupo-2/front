import type { ReactNode } from 'react'
import styles from './PainelDashboard.module.css'

export type EstadoPainel = 'carregando' | 'erro' | 'vazio' | 'pronto'

interface PainelDashboardProps {
  titulo: string
  estado: EstadoPainel
  mensagemErro?: string
  mensagemVazia?: string
  /**
   * Sem o cartão em volta do conteúdo pronto: para listas em que cada item
   * já é um cartão ("Precisa de atenção"). Os estados seguem no cartão.
   */
  semCartao?: boolean
  /** O cartão cresce até o fim da coluna (acompanha a altura da vizinha). */
  esticar?: boolean
  children: ReactNode
}

/**
 * Bloco da visão geral, como no protótipo: rótulo em caixa alta fora do
 * cartão e o conteúdo dentro. Cada bloco cuida do próprio estado e não
 * desmonta o restante do painel.
 */
export function PainelDashboard({
  titulo,
  estado,
  mensagemErro,
  mensagemVazia = 'Ainda não há dados para exibir.',
  semCartao = false,
  esticar = false,
  children,
}: PainelDashboardProps) {
  return (
    <section
      className={`${styles.panel} ${esticar ? styles.panelEsticado : ''}`}
      aria-busy={estado === 'carregando'}
      aria-labelledby={`painel-${slug(titulo)}`}
    >
      <h3 id={`painel-${slug(titulo)}`} className={styles.title}>
        {titulo}
      </h3>
      <div
        className={semCartao && estado === 'pronto' ? undefined : styles.card}
      >
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
      </div>
    </section>
  )
}

function slug(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
