import type { ReactNode } from 'react'
import {
  ROTULOS_STATUS_PDI,
  type PdiDetalhe,
  type StatusPdi,
} from '../../types/pdi.ts'
import { formatarData } from '../trilhas/formatacao.ts'
import {
  BarraProgresso,
  Selo,
  type TomSelo,
} from '../trilhas/StatusProgresso.tsx'
import styles from './PdiResumoPainel.module.css'

const TOM_POR_STATUS_PDI: Record<StatusPdi, TomSelo> = {
  ATIVO: 'atencao',
  CONCLUIDO: 'sucesso',
  CANCELADO: 'perigo',
}

/** Selo com o status do PDI, usado no painel e na lista da equipe. */
export function SeloStatusPdi({ status }: { status: StatusPdi }) {
  return (
    <Selo tom={TOM_POR_STATUS_PDI[status]}>{ROTULOS_STATUS_PDI[status]}</Selo>
  )
}

interface PdiResumoPainelProps {
  pdi: PdiDetalhe
  /** No "Meu PDI" o colaborador é quem está vendo: mostra o gestor. */
  mostrar: 'gestor' | 'colaborador'
  /** Botão no pé do cartão (ex.: "Ver trilhas" no editor). */
  acao?: ReactNode
}

/**
 * Ciclo, período, status e percentual do PDI. O percentual acompanha o
 * colaborador: é a média do progresso dele em cada trilha ligada (a API
 * calcula), então sobe a cada etapa concluída, não só no fim da trilha.
 */
export function PdiResumoPainel({ pdi, mostrar, acao }: PdiResumoPainelProps) {
  const pessoa = mostrar === 'gestor' ? pdi.gestor : pdi.colaborador
  return (
    <div className={styles.painel}>
      <div className={styles.topo}>
        <SeloStatusPdi status={pdi.status} />
        <span className={styles.percentual}>{pdi.percentual}%</span>
      </div>
      <BarraProgresso
        percentual={pdi.percentual}
        rotulo={`Progresso do PDI ${pdi.ciclo}`}
        semValor
      />
      <p className={styles.contagem}>
        {pdi.totalAcoes === 0
          ? 'Nenhuma trilha ligada ainda'
          : `Progresso médio nas trilhas · ${pdi.acoesConcluidas} de ${pdi.totalAcoes} ${
              pdi.totalAcoes === 1 ? 'concluída' : 'concluídas'
            }`}
      </p>
      <dl className={styles.dados}>
        <div>
          <dt>Ciclo</dt>
          <dd>{pdi.ciclo}</dd>
        </div>
        <div>
          <dt>Período</dt>
          <dd>
            {formatarData(pdi.inicio)} a {formatarData(pdi.fim)}
          </dd>
        </div>
        <div>
          <dt>{mostrar === 'gestor' ? 'Gestor' : 'Colaborador'}</dt>
          <dd>{pessoa.nomeCompleto}</dd>
        </div>
      </dl>
      {acao && <div className={styles.acao}>{acao}</div>}
    </div>
  )
}
