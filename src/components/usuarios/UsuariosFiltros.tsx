import { useId, type FormEvent } from 'react'
import {
  PERFIS,
  ROTULOS_PERFIL,
  ROTULOS_SITUACAO,
  SITUACOES,
  type UsuarioFiltro,
} from '../../types/usuario.ts'
import styles from './UsuariosFiltros.module.css'

interface UsuariosFiltrosProps {
  /** Valores em edição. O componente é controlado: quem filtra é a página. */
  valores: UsuarioFiltro
  onChange: (valores: UsuarioFiltro) => void
  onAplicar: () => void
  onLimpar: () => void
  carregando: boolean
}

/**
 * Filtros da listagem. Não chama a API: devolve os valores para a página, que
 * é dona da busca — assim a tabela e o formulário continuam sem HTTP dentro.
 */
export function UsuariosFiltros({
  valores,
  onChange,
  onAplicar,
  onLimpar,
  carregando,
}: UsuariosFiltrosProps) {
  const idBase = useId()

  function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    onAplicar()
  }

  function alterar(campo: keyof UsuarioFiltro, valor: string) {
    onChange({ ...valores, [campo]: valor })
  }

  return (
    <form
      className={styles.filtros}
      onSubmit={aoSubmeter}
      aria-label="Filtros de usuários"
    >
      <div className={styles.campo}>
        <label htmlFor={`${idBase}-nome`}>Nome</label>
        <input
          id={`${idBase}-nome`}
          type="search"
          value={valores.nome ?? ''}
          onChange={(evento) => alterar('nome', evento.target.value)}
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor={`${idBase}-email`}>E-mail</label>
        <input
          id={`${idBase}-email`}
          type="search"
          value={valores.email ?? ''}
          onChange={(evento) => alterar('email', evento.target.value)}
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor={`${idBase}-departamento`}>Departamento</label>
        <input
          id={`${idBase}-departamento`}
          type="search"
          value={valores.departamento ?? ''}
          onChange={(evento) => alterar('departamento', evento.target.value)}
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor={`${idBase}-perfil`}>Perfil</label>
        <select
          id={`${idBase}-perfil`}
          value={valores.perfil ?? ''}
          onChange={(evento) => alterar('perfil', evento.target.value)}
        >
          <option value="">Todos</option>
          {PERFIS.map((perfil) => (
            <option key={perfil} value={perfil}>
              {ROTULOS_PERFIL[perfil]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.campo}>
        <label htmlFor={`${idBase}-situacao`}>Situação</label>
        <select
          id={`${idBase}-situacao`}
          value={valores.situacao ?? ''}
          onChange={(evento) => alterar('situacao', evento.target.value)}
        >
          <option value="">Todas</option>
          {SITUACOES.map((situacao) => (
            <option key={situacao} value={situacao}>
              {ROTULOS_SITUACAO[situacao]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.acoes}>
        <button type="submit" className={styles.aplicar} disabled={carregando}>
          Filtrar
        </button>
        <button type="button" className={styles.limpar} onClick={onLimpar}>
          Limpar
        </button>
      </div>
    </form>
  )
}
