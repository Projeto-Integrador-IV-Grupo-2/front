import { Link } from 'react-router-dom'
import { caminhoTrilha } from '../../routes/paths.ts'
import type {
  ColaboradorAcompanhamento,
  ColaboradorResumo,
  TotaisPorStatus,
} from '../../types/atribuicao.ts'
import { PainelLateral } from '../comum/PainelLateral.tsx'
import { formatarDataCurta } from '../trilhas/formatacao.ts'
import { BarraProgresso, SeloStatus } from '../trilhas/StatusProgresso.tsx'
import styles from './ColaboradorPainel.module.css'

interface ColaboradorPainelProps {
  /** Quem foi clicado — o cabeçalho aparece antes de os dados chegarem. */
  colaborador: ColaboradorResumo
  /** `null` enquanto carrega. */
  dados: ColaboradorAcompanhamento | null
  erro: string | null
  onTentarDeNovo: () => void
  onFechar: () => void
}

const TOTAIS: Array<{ campo: keyof TotaisPorStatus; rotulo: string }> = [
  { campo: 'total', rotulo: 'Total' },
  { campo: 'naoIniciadas', rotulo: 'Não iniciadas' },
  { campo: 'emAndamento', rotulo: 'Em andamento' },
  { campo: 'concluidas', rotulo: 'Concluídas' },
  { campo: 'atrasadas', rotulo: 'Atrasadas' },
]

/** Visão de um colaborador: totais por status e todas as trilhas dele. */
export function ColaboradorPainel({
  colaborador,
  dados,
  erro,
  onTentarDeNovo,
  onFechar,
}: ColaboradorPainelProps) {
  const area = dados?.area?.nome

  return (
    <PainelLateral
      titulo={colaborador.nomeCompleto}
      subtitulo={area ? `${colaborador.email} · ${area}` : colaborador.email}
      onFechar={onFechar}
    >
      {erro ? (
        <div className={styles.erro} role="alert">
          <p>{erro}</p>
          <button type="button" onClick={onTentarDeNovo}>
            Tentar novamente
          </button>
        </div>
      ) : dados === null ? (
        <p role="status" className={styles.estado}>
          Carregando trilhas do colaborador…
        </p>
      ) : (
        <div className={styles.conteudo}>
          <dl className={styles.totais}>
            {TOTAIS.map(({ campo, rotulo }) => (
              <div
                key={campo}
                className={
                  campo === 'atrasadas' && dados.totais.atrasadas > 0
                    ? `${styles.total} ${styles.totalAlerta}`
                    : styles.total
                }
              >
                <dt>{rotulo}</dt>
                <dd>{dados.totais[campo]}</dd>
              </div>
            ))}
          </dl>

          {dados.trilhas.length === 0 ? (
            <p className={styles.estado}>
              Este colaborador ainda não tem trilhas.
            </p>
          ) : (
            <ul
              className={styles.lista}
              aria-label={`Trilhas de ${colaborador.nomeCompleto}`}
            >
              {dados.trilhas.map((item) => (
                <li
                  key={item.id}
                  className={
                    item.status === 'ATRASADA'
                      ? `${styles.item} ${styles.itemAtrasado}`
                      : styles.item
                  }
                >
                  <div className={styles.linha}>
                    <Link
                      to={caminhoTrilha(item.trilha.id)}
                      className={styles.nome}
                    >
                      {item.trilha.nome}
                    </Link>
                    <SeloStatus status={item.status} />
                  </div>
                  <p className={styles.prazo}>
                    {item.prazo
                      ? `Prazo: ${formatarDataCurta(item.prazo)}`
                      : 'Sem prazo'}
                  </p>
                  <BarraProgresso
                    percentual={item.percentual}
                    rotulo={`Progresso em ${item.trilha.nome}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </PainelLateral>
  )
}
