import { Link } from 'react-router-dom'
import { caminhoTrilha } from '../../routes/paths.ts'
import type { TrilhaResumo } from '../../types/trilha.ts'
import { CORES_DE_AREA, corPeloId } from './coresDasAreas.ts'
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
  coresDasAreas,
}: {
  trilha: TrilhaResumo
  /** Status e barra são do progresso pessoal: a gestão não os vê. */
  mostrarProgresso?: boolean
  /** Cor de cada área (ver `coresPorArea`); sem ela, a cor sai do nome. */
  coresDasAreas?: Map<string, number>
}) {
  const progresso = mostrarProgresso ? trilha.progresso : null
  // Cor de destaque do cartão: sempre a da área. Trilhas da mesma área têm a
  // mesma cor, para qualquer perfil.
  const acento = ACENTOS[corDaArea(trilha, coresDasAreas)]

  return (
    <li className={styles.item}>
      <Link
        to={caminhoTrilha(trilha.id)}
        className={`${styles.card} ${acento}`}
      >
        <span className={styles.faixa} aria-hidden="true" />
        <span className={styles.topo}>
          <span className={styles.icone} aria-hidden="true">
            <IconeTrilha />
          </span>
          <span className={styles.selos}>
            {progresso && <SeloStatus status={progresso.status} />}
            <SeloNeutro>{trilha.area?.nome ?? 'Multi-área'}</SeloNeutro>
          </span>
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

/** Paleta das áreas. Trilha sem área (multi-área) fica no cinza-azulado. */
const ACENTOS = [
  styles.acentoAzul,
  styles.acentoRoxo,
  styles.acentoCiano,
  styles.acentoVerde,
  styles.acentoLaranja,
  styles.acentoRosa,
  styles.acentoAmarelo,
  styles.acentoTurquesa,
  styles.acentoIndigo,
  styles.acentoVinho,
  styles.acentoNeutro,
]
// As dez primeiras são das áreas (CORES_DE_AREA); a última, de quem não tem.
const COR_SEM_AREA = CORES_DE_AREA

function corDaArea(
  trilha: TrilhaResumo,
  cores: Map<string, number> | undefined,
): number {
  if (!trilha.area) return COR_SEM_AREA
  return cores?.get(trilha.area.id) ?? corPeloId(trilha.area.id)
}

function IconeTrilha() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="5" cy="5" r="2" />
      <circle cx="15" cy="10" r="2" />
      <circle cx="5" cy="15" r="2" />
      <path d="M7 5.5l6 3.5M7 14.5l6-3.5" />
    </svg>
  )
}
