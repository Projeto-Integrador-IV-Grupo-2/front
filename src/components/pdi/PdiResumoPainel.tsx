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
}

/** Ciclo, período, status e percentual do PDI (ações concluídas / total). */
export function PdiResumoPainel({ pdi, mostrar }: PdiResumoPainelProps) {
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
        {pdi.acoesConcluidas} de {pdi.totalAcoes}{' '}
        {pdi.totalAcoes === 1 ? 'ação concluída' : 'ações concluídas'}
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
    </div>
  )
}
