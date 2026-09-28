import { Link } from 'react-router-dom'
import { caminhoTrilha } from '../../routes/paths.ts'
import type { TrilhaResumo } from '../../types/trilha.ts'
import { BarraProgresso, SeloNeutro, SeloStatus } from './StatusProgresso.tsx'
import styles from './TrilhaCard.module.css'

/**
 * Cartão da listagem. O cartão inteiro é um link para o detalhe — alvo de
 * clique grande no celular e um único Tab por trilha no teclado.
 *
 * Progresso e objetivo só aparecem quando a API os devolve na listagem
 * (ver `TrilhaResumo`); sem eles o cartão mostra nome e área.
 */
export function TrilhaCard({ trilha }: { trilha: TrilhaResumo }) {
  const { progresso } = trilha

  return (
    <li className={styles.item}>
      <Link to={caminhoTrilha(trilha.id)} className={styles.card}>
        <span className={styles.selos}>
          {progresso && <SeloStatus status={progresso.status} />}
          <SeloNeutro>{trilha.area?.nome ?? 'Multi-área'}</SeloNeutro>
        </span>
        <h2 className={styles.nome}>{trilha.nome}</h2>
        {trilha.objetivos && (
          <p className={styles.objetivo}>{trilha.objetivos}</p>
        )}
        {progresso && (
          <span className={styles.progresso}>
            <BarraProgresso
              percentual={progresso.percentual}
              rotulo={`Progresso em ${trilha.nome}`}
            />
          </span>
        )}
      </Link>
    </li>
  )
}
