import { useId } from 'react'
import {
  ROTULOS_STATUS_PROGRESSO,
  STATUS_PROGRESSO,
  type StatusProgresso,
} from '../../types/trilha.ts'
import type { RecursoResumo } from '../../types/usuario.ts'
import styles from './TrilhasFiltros.module.css'

export interface ValoresFiltroTrilhas {
  nome: string
  areaId: string
  status: StatusProgresso | ''
}

interface TrilhasFiltrosProps {
  /** Valores em edição. Controlado: quem decide quando buscar é a página. */
  valores: ValoresFiltroTrilhas
  onChange: (valores: ValoresFiltroTrilhas) => void
  onLimpar: () => void
  /** `null` enquanto carregam; vazio quando não vieram — o select some. */
  areas: RecursoResumo[] | null
}

/**
 * Busca e filtros da listagem de trilhas. Não chama a API: devolve os valores
 * à página, que adia a busca por nome para não disparar uma requisição a cada
 * tecla. Os selects valem na hora.
 */
export function TrilhasFiltros({
  valores,
  onChange,
  onLimpar,
  areas,
}: TrilhasFiltrosProps) {
  const idBase = useId()
  const temFiltro =
    valores.nome !== '' || valores.areaId !== '' || valores.status !== ''

  function alterar<K extends keyof ValoresFiltroTrilhas>(
    campo: K,
    valor: ValoresFiltroTrilhas[K],
  ) {
    onChange({ ...valores, [campo]: valor })
  }

  return (
    <div
      className={styles.filtros}
      role="search"
      aria-label="Filtros de trilhas"
    >
      <div className={`${styles.campo} ${styles.busca}`}>
        <label htmlFor={`${idBase}-nome`}>Buscar</label>
        <input
          id={`${idBase}-nome`}
          type="search"
          placeholder="Nome da trilha"
          value={valores.nome}
          onChange={(evento) => alterar('nome', evento.target.value)}
        />
      </div>

      {areas !== null && areas.length > 0 && (
        <div className={styles.campo}>
          <label htmlFor={`${idBase}-area`}>Área</label>
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
