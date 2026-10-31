import { Link } from 'react-router-dom'
import { caminhoTrilha } from '../../routes/paths.ts'
import type { TrilhaResumo } from '../../types/trilha.ts'
import { formatarData } from './formatacao.ts'
import { BarraProgresso, SeloNeutro, SeloStatus } from './StatusProgresso.tsx'
import styles from './TrilhaCard.module.css'

/**
 * Cartão da listagem. O cartão inteiro é um link para o detalhe — alvo de
 * clique grande no celular e um único Tab por trilha no teclado.
 *
 * Progresso e objetivo só aparecem quando a API os devolve na listagem
 * (ver `TrilhaResumo`); sem eles o cartão mostra nome e área.
 *
 * O prazo fica ao lado da barra e, quando a trilha está atrasada, ganha
 * destaque junto do selo "Atrasada" — é o que a pessoa precisa ver primeiro
 * na lista.
 */
export function TrilhaCard({
  trilha,
  mostrarProgresso = true,
}: {
  trilha: TrilhaResumo
  /** Status e barra são do progresso pessoal: a gestão não os vê. */
  mostrarProgresso?: boolean
}) {
  const progresso = mostrarProgresso ? trilha.progresso : null

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
            {progresso.prazo && (
              <span
                className={
                  progresso.status === 'ATRASADA'
                    ? `${styles.prazo} ${styles.prazoAtrasado}`
                    : styles.prazo
                }
              >
                {progresso.status === 'ATRASADA' ? 'Venceu em ' : 'Prazo: '}
                {formatarData(progresso.prazo)}
              </span>
            )}
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
