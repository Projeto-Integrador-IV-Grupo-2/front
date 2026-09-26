import {
  ROTULOS_STATUS_PROGRESSO,
  type StatusProgresso,
} from '../../types/trilha.ts'
import styles from './StatusProgresso.module.css'

const TOM_POR_STATUS: Record<StatusProgresso, string> = {
  NAO_INICIADA: styles.neutro,
  EM_ANDAMENTO: styles.atencao,
  ATRASADA: styles.perigo,
  CONCLUIDA: styles.sucesso,
}

/** Selo com o status do progresso — mesmas cores do protótipo em toda a área de trilhas. */
export function SeloStatus({ status }: { status: StatusProgresso }) {
  return (
    <span className={`${styles.selo} ${TOM_POR_STATUS[status]}`}>
      {ROTULOS_STATUS_PROGRESSO[status]}
    </span>
  )
}

/** Selo neutro para informação que não é status (ex.: a área da trilha). */
export function SeloNeutro({ children }: { children: string }) {
  return <span className={`${styles.selo} ${styles.neutro}`}>{children}</span>
}

interface BarraProgressoProps {
  percentual: number
  /** Nome acessível da barra, ex.: "Progresso em Atendimento ao Cliente". */
  rotulo: string
  /** Esconde o número ao lado quando a tela já mostra o percentual em outro lugar. */
  semValor?: boolean
}

export function BarraProgresso({
  percentual,
  rotulo,
  semValor = false,
}: BarraProgressoProps) {
  const valor = Math.min(100, Math.max(0, Math.round(percentual)))
  return (
    <div className={styles.linha}>
      <div
        className={styles.trilho}
        role="progressbar"
        aria-label={rotulo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valor}
      >
        <div className={styles.preenchido} style={{ width: `${valor}%` }} />
      </div>
      {!semValor && (
        <span className={styles.valor} aria-hidden="true">
          {valor}%
        </span>
      )}
    </div>
  )
}
