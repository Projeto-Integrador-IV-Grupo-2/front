import { Link } from 'react-router-dom'
import { caminhoTrilha } from '../../routes/paths.ts'
import type { Area } from '../../types/area.ts'
import type { TrilhaResumo } from '../../types/trilha.ts'
import { PainelLateral } from '../comum/PainelLateral.tsx'
import { SeloStatus } from '../trilhas/StatusProgresso.tsx'
import styles from './AreaTrilhasPainel.module.css'

interface AreaTrilhasPainelProps {
  area: Area
  /** `null` enquanto carrega. */
  trilhas: TrilhaResumo[] | null
  total: number
  erro: string | null
  onTentarDeNovo: () => void
  onFechar: () => void
}

/**
 * Trilhas ativas de uma área. Só apresenta: a página busca e entrega os dados.
 * O status mostrado é o do próprio usuário em cada trilha.
 */
export function AreaTrilhasPainel({
  area,
  trilhas,
  total,
  erro,
  onTentarDeNovo,
  onFechar,
}: AreaTrilhasPainelProps) {
  return (
    <PainelLateral
      titulo={`Trilhas de ${area.nome}`}
      subtitulo="Trilhas ativas desta área."
      onFechar={onFechar}
    >
      {erro ? (
        <div className={styles.erro} role="alert">
          <p>{erro}</p>
          <button type="button" onClick={onTentarDeNovo}>
            Tentar novamente
          </button>
        </div>
      ) : trilhas === null ? (
        <p role="status" className={styles.estado}>
          Carregando trilhas…
        </p>
      ) : trilhas.length === 0 ? (
        <p className={styles.estado}>Nenhuma trilha ativa nesta área.</p>
      ) : (
        <>
          <ul className={styles.lista} aria-label={`Trilhas de ${area.nome}`}>
            {trilhas.map((trilha) => (
              <li key={trilha.id} className={styles.item}>
                <Link to={caminhoTrilha(trilha.id)} className={styles.nome}>
                  {trilha.nome}
                </Link>
                {trilha.progresso && (
                  <SeloStatus status={trilha.progresso.status} />
                )}
              </li>
            ))}
          </ul>
          {total > trilhas.length && (
            <p className={styles.estado}>
              Mostrando {trilhas.length} de {total} trilhas.
            </p>
          )}
        </>
      )}
    </PainelLateral>
  )
}
