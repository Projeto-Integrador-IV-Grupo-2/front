import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { caminhoTrilha } from '../../routes/paths.ts'
import { ROTULOS_TIPO_COMPETENCIA } from '../../types/competencia.ts'
import {
  ROTULOS_STATUS_ACAO,
  ROTULOS_TIPO_ACAO,
  type PdiAcao,
  type PdiItem,
  type StatusAcaoPdi,
} from '../../types/pdi.ts'
import { formatarData } from '../trilhas/formatacao.ts'
import {
  BarraProgresso,
  Selo,
  SeloNeutro,
  SeloStatus,
  type TomSelo,
} from '../trilhas/StatusProgresso.tsx'
import styles from './CompetenciaPdi.module.css'

const TOM_POR_STATUS_ACAO: Record<StatusAcaoPdi, TomSelo> = {
  PENDENTE: 'neutro',
  EM_ANDAMENTO: 'atencao',
  CONCLUIDA: 'sucesso',
  CANCELADA: 'perigo',
}

interface CompetenciaPdiProps {
  item: PdiItem
  /** Espaço do editor para o formulário "Ligar trilha". */
  children?: ReactNode
}

/**
 * Uma competência do PDI: níveis atual e alvo, observação e as ações. Usado
 * em "Meu PDI" e no editor, para os dois mostrarem o mesmo dado do mesmo
 * jeito. A trilha ligada é um link para o detalhe dela.
 */
export function CompetenciaPdi({ item, children }: CompetenciaPdiProps) {
  const tituloId = `competencia-${item.id}`
  return (
    <li className={styles.item}>
      <section aria-labelledby={tituloId}>
        <div className={styles.topo}>
          <h3 id={tituloId} className={styles.nome}>
            {item.competencia.nome}
          </h3>
          <SeloNeutro>
            {ROTULOS_TIPO_COMPETENCIA[item.competencia.tipo]}
          </SeloNeutro>
        </div>
        <p className={styles.niveis}>
          Nível atual <strong>{item.nivelAtual}</strong> → alvo{' '}
          <strong>{item.nivelAlvo}</strong>
          <span className="visually-hidden"> (escala de 1 a 5)</span>
        </p>
        {item.observacao && (
          <p className={styles.observacao}>{item.observacao}</p>
        )}

        {item.acoes.length === 0 ? (
          <p className={styles.semAcoes}>Nenhuma trilha ligada ainda.</p>
        ) : (
          <ul
            className={styles.acoes}
            aria-label={`Ações de ${item.competencia.nome}`}
          >
            {item.acoes.map((acao) => (
              <AcaoPdi key={acao.id} acao={acao} />
            ))}
          </ul>
        )}

        {children}
      </section>
    </li>
  )
}

function AcaoPdi({ acao }: { acao: PdiAcao }) {
  const prazo = acao.prazo ? `Prazo: ${formatarData(acao.prazo)}` : null

  if (acao.tipo === 'TRILHA' && acao.trilha) {
    const progresso = acao.progressoTrilha
    return (
      <li className={styles.acao}>
        <div className={styles.acaoTopo}>
          <Link to={caminhoTrilha(acao.trilha.id)} className={styles.trilha}>
            {acao.trilha.nome}
          </Link>
          {progresso ? (
            <SeloStatus status={progresso.status} />
          ) : (
            <Selo tom={TOM_POR_STATUS_ACAO[acao.status]}>
              {ROTULOS_STATUS_ACAO[acao.status]}
            </Selo>
          )}
        </div>
        {prazo && <p className={styles.prazo}>{prazo}</p>}
        <BarraProgresso
          percentual={
            progresso?.percentual ?? (acao.status === 'CONCLUIDA' ? 100 : 0)
          }
          rotulo={`Progresso em ${acao.trilha.nome}`}
        />
      </li>
    )
  }

  return (
    <li className={styles.acao}>
      <div className={styles.acaoTopo}>
        <span className={styles.descricao}>
          {ROTULOS_TIPO_ACAO[acao.tipo]}: {acao.descricao}
        </span>
        <Selo tom={TOM_POR_STATUS_ACAO[acao.status]}>
          {ROTULOS_STATUS_ACAO[acao.status]}
        </Selo>
      </div>
      {prazo && <p className={styles.prazo}>{prazo}</p>}
    </li>
  )
}
