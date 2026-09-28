import type { ProgressoTrilha, StatusProgresso } from '../../types/trilha.ts'
import { formatarData, formatarInstante } from './formatacao.ts'
import { Selo, type TomSelo } from './StatusProgresso.tsx'
import styles from './JornadaTrilha.module.css'

type EstadoMarco = 'feito' | 'atual' | 'pendente'

interface Marco {
  titulo: string
  meta: string
  selo: string
  tom: TomSelo
  estado: EstadoMarco
}

function marcoDeAndamento(progresso: ProgressoTrilha): Marco {
  const prazo = progresso.prazo
    ? `Prazo: ${formatarData(progresso.prazo)}`
    : 'Sem prazo definido'
  const estados: Record<StatusProgresso, Marco> = {
    NAO_INICIADA: {
      titulo: 'Em andamento',
      meta: 'Começa quando a trilha for iniciada',
      selo: 'Pendente',
      tom: 'neutro',
      estado: 'pendente',
    },
    EM_ANDAMENTO: {
      titulo: 'Em andamento',
      meta: prazo,
      selo: 'Em andamento',
      tom: 'atencao',
      estado: 'atual',
    },
    ATRASADA: {
      titulo: 'Em andamento',
      meta: prazo,
      selo: 'Atrasada',
      tom: 'perigo',
      estado: 'atual',
    },
    CONCLUIDA: {
      titulo: 'Em andamento',
      meta: progresso.prazo ? prazo : 'Etapa cumprida',
      selo: 'Concluída',
      tom: 'sucesso',
      estado: 'feito',
    },
  }
  return estados[progresso.status]
}

/**
 * Marcos do progresso, na linha do tempo do protótipo. A API ainda não tem
 * etapas de conteúdo (`trilha_etapa` é outro card), então a jornada mostra o
 * que existe de verdade: início, andamento e conclusão da trilha.
 */
function marcosDe(
  progresso: ProgressoTrilha,
  prazoDias: number | null,
): Marco[] {
  const iniciada = progresso.status !== 'NAO_INICIADA'
  const concluida = progresso.status === 'CONCLUIDA'

  return [
    {
      titulo: 'Início da trilha',
      meta:
        iniciada && progresso.atribuidoEm
          ? `Iniciada em ${formatarInstante(progresso.atribuidoEm)}`
          : 'Disponível para começar',
      selo: iniciada ? 'Concluído' : 'Não iniciada',
      tom: iniciada ? 'sucesso' : 'neutro',
      estado: iniciada ? 'feito' : 'atual',
    },
    marcoDeAndamento(progresso),
    {
      titulo: 'Conclusão',
      meta:
        concluida && progresso.concluidoEm
          ? `Concluída em ${formatarInstante(progresso.concluidoEm)}`
          : prazoDias
            ? `Duração prevista: ${prazoDias} ${prazoDias === 1 ? 'dia' : 'dias'}`
            : 'Sem duração prevista',
      selo: concluida ? 'Concluída' : 'Pendente',
      tom: concluida ? 'sucesso' : 'neutro',
      estado: concluida ? 'feito' : 'pendente',
    },
  ]
}

interface JornadaTrilhaProps {
  progresso: ProgressoTrilha
  prazoDias: number | null
}

export function JornadaTrilha({ progresso, prazoDias }: JornadaTrilhaProps) {
  const marcos = marcosDe(progresso, prazoDias)

  return (
    <ol className={styles.jornada}>
      {marcos.map((marco, indice) => (
        <li
          key={marco.titulo}
          className={`${styles.marco} ${styles[marco.estado]}`}
          aria-current={marco.estado === 'atual' ? 'step' : undefined}
        >
          <span className={styles.ponto} aria-hidden="true">
            {marco.estado === 'feito' ? '✓' : indice + 1}
          </span>
          <div className={styles.texto}>
            <div className={styles.linhaTitulo}>
              <h3 className={styles.titulo}>{marco.titulo}</h3>
              <Selo tom={marco.tom}>{marco.selo}</Selo>
            </div>
            <p className={styles.meta}>{marco.meta}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
