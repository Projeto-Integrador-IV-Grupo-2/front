import { useId } from 'react'
import type { AtribuicaoFiltro } from '../../types/atribuicao.ts'
import {
  ROTULOS_STATUS_PROGRESSO,
  STATUS_PROGRESSO,
  type StatusProgresso,
} from '../../types/trilha.ts'
import type { RecursoResumo } from '../../types/usuario.ts'
import styles from './AcompanhamentoFiltros.module.css'

export type ValoresFiltroAcompanhamento = Required<
  Pick<AtribuicaoFiltro, 'trilhaId' | 'areaId' | 'status'>
>

interface AcompanhamentoFiltrosProps {
  valores: ValoresFiltroAcompanhamento
  onChange: (valores: ValoresFiltroAcompanhamento) => void
  onLimpar: () => void
  /** Opções dos selects; vazias quando não carregaram — o select some. */
  trilhas: RecursoResumo[]
  areas: RecursoResumo[]
}

/**
 * Filtros do acompanhamento. Todos são selects, então valem na hora sem
 * gerar uma requisição por tecla; a busca continua sendo da página.
 */
export function AcompanhamentoFiltros({
  valores,
  onChange,
  onLimpar,
  trilhas,
  areas,
}: AcompanhamentoFiltrosProps) {
  const idBase = useId()
  const temFiltro =
    valores.trilhaId !== '' || valores.areaId !== '' || valores.status !== ''

  function alterar<K extends keyof ValoresFiltroAcompanhamento>(
    campo: K,
    valor: ValoresFiltroAcompanhamento[K],
  ) {
    onChange({ ...valores, [campo]: valor })
  }

  return (
    <div
      className={styles.filtros}
      role="search"
      aria-label="Filtros do acompanhamento"
    >
      {trilhas.length > 0 && (
        <div className={styles.campo}>
          <label htmlFor={`${idBase}-trilha`}>Trilha</label>
          <select
            id={`${idBase}-trilha`}
            value={valores.trilhaId}
            onChange={(evento) => alterar('trilhaId', evento.target.value)}
          >
            <option value="">Todas</option>
            {trilhas.map((trilha) => (
              <option key={trilha.id} value={trilha.id}>
                {trilha.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {areas.length > 0 && (
        <div className={styles.campo}>
          <label htmlFor={`${idBase}-area`}>Área do colaborador</label>
          <select
            id={`${idBase}-area`}
            value={valores.areaId}
            onChange={(evento) => alterar('areaId', evento.target.value)}
          >
            <option value="">Todas</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.campo}>
        <label htmlFor={`${idBase}-status`}>Status</label>
        <select
          id={`${idBase}-status`}
          value={valores.status}
          onChange={(evento) =>
            alterar('status', evento.target.value as StatusProgresso | '')
          }
        >
          <option value="">Todos</option>
          {STATUS_PROGRESSO.map((status) => (
            <option key={status} value={status}>
              {ROTULOS_STATUS_PROGRESSO[status]}
            </option>
          ))}
        </select>
      </div>

      {temFiltro && (
        <button type="button" className={styles.limpar} onClick={onLimpar}>
          Limpar filtros
        </button>
      )}
    </div>
  )
}
