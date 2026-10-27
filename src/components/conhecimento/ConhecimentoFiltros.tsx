import { useId } from 'react'
import {
  ROTULOS_STATUS_CONTEUDO,
  ROTULOS_TIPO_CONTEUDO,
  type Categoria,
  type StatusConteudo,
  type TipoConteudo,
} from '../../types/conteudo.ts'
import type { RecursoResumo } from '../../types/usuario.ts'
import {
  TIPOS_NO_FILTRO,
  type FiltroConhecimento,
} from './filtroConhecimento.ts'
import styles from './ConhecimentoFiltros.module.css'

interface ConhecimentoFiltrosProps {
  /** O que está no campo de busca agora (a busca sai adiada, na página). */
  tituloDigitado: string
  filtro: FiltroConhecimento
  categorias: Categoria[]
  areas: RecursoResumo[]
  /** ADMIN e GESTOR filtram por status; colaborador nem vê o campo. */
  podeFiltrarStatus: boolean
  mostrarLimpar: boolean
  onTitulo: (titulo: string) => void
  onAlterar: (parcial: Partial<FiltroConhecimento>) => void
  onLimpar: () => void
}

/**
 * Busca por título e filtros de categoria, área, tipo e (para quem gerencia)
 * status. Só apresenta e avisa a página — quem busca na API é ela.
 */
export function ConhecimentoFiltros({
  tituloDigitado,
  filtro,
  categorias,
  areas,
  podeFiltrarStatus,
  mostrarLimpar,
  onTitulo,
  onAlterar,
  onLimpar,
}: ConhecimentoFiltrosProps) {
  const id = useId()

  return (
    <form
      className={styles.filtros}
      role="search"
      aria-label="Buscar documentos"
      onSubmit={(evento) => evento.preventDefault()}
    >
      <div className={`${styles.campo} ${styles.busca}`}>
        <label htmlFor={`${id}-titulo`}>Buscar por título</label>
        <input
          id={`${id}-titulo`}
          type="search"
          placeholder="Ex.: política de férias"
          value={tituloDigitado}
          onChange={(evento) => onTitulo(evento.target.value)}
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor={`${id}-categoria`}>Categoria</label>
        <select
          id={`${id}-categoria`}
          value={filtro.categoriaId}
          onChange={(evento) => onAlterar({ categoriaId: evento.target.value })}
        >
          <option value="">Todas</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.campo}>
        <label htmlFor={`${id}-area`}>Área</label>
        <select
          id={`${id}-area`}
          value={filtro.areaId}
          onChange={(evento) => onAlterar({ areaId: evento.target.value })}
        >
          <option value="">Todas</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.nome}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.campo}>
        <label htmlFor={`${id}-tipo`}>Tipo</label>
        <select
          id={`${id}-tipo`}
          value={filtro.tipo}
          onChange={(evento) =>
            onAlterar({ tipo: evento.target.value as TipoConteudo | '' })
          }
        >
          <option value="">Todos</option>
          {TIPOS_NO_FILTRO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {ROTULOS_TIPO_CONTEUDO[tipo]}
            </option>
          ))}
        </select>
      </div>

      {podeFiltrarStatus && (
        <div className={styles.campo}>
          <label htmlFor={`${id}-status`}>Status</label>
          <select
            id={`${id}-status`}
            value={filtro.status}
            onChange={(evento) =>
              onAlterar({ status: evento.target.value as StatusConteudo | '' })
            }
          >
            <option value="">Todos</option>
            {(Object.keys(ROTULOS_STATUS_CONTEUDO) as StatusConteudo[]).map(
              (status) => (
                <option key={status} value={status}>
                  {ROTULOS_STATUS_CONTEUDO[status]}
                </option>
              ),
            )}
          </select>
        </div>
      )}

      {mostrarLimpar && (
        <button type="button" className={styles.limpar} onClick={onLimpar}>
          Limpar filtros
        </button>
      )}
    </form>
  )
}
