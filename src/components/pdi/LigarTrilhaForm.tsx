import { useId, useState, type FormEvent } from 'react'
import type { ApiFieldError } from '../../types/api.ts'
import type { LigarTrilhaRequest } from '../../types/pdi.ts'
import type { RecursoResumo } from '../../types/usuario.ts'
import { ariaDoCampo } from './campo.ts'
import { Campo } from './Dialogo.tsx'
import dialogo from './Dialogo.module.css'
import styles from './FormularioInline.module.css'

interface LigarTrilhaFormProps {
  /** Nome da competência, para o rótulo acessível do formulário. */
  competencia: string
  trilhas: RecursoResumo[]
  salvando: boolean
  erro: string | null
  fieldErrors: ApiFieldError[]
  onLigar: (request: LigarTrilhaRequest) => void
}

/**
 * Liga uma trilha a uma competência do PDI, com prazo. A API atribui a trilha
 * ao colaborador com esse prazo (sem duplicar se ele já tiver a trilha).
 */
export function LigarTrilhaForm({
  competencia,
  trilhas,
  salvando,
  erro,
  fieldErrors,
  onLigar,
}: LigarTrilhaFormProps) {
  const idBase = useId()
  const [trilhaId, setTrilhaId] = useState('')
  const [prazo, setPrazo] = useState('')
  const [errosLocais, setErrosLocais] = useState<Record<string, string>>({})

  function erroDoCampo(campo: string): string | undefined {
    return (
      fieldErrors.find((item) => item.field === campo)?.message ??
      errosLocais[campo]
    )
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const erros: Record<string, string> = {}
    if (trilhaId === '') {
      erros.trilhaId = 'Escolha a trilha.'
    }
    if (prazo === '') {
      erros.prazo = 'Informe o prazo.'
    }
    setErrosLocais(erros)
    if (Object.keys(erros).length > 0) {
      return
    }
    onLigar({ tipo: 'TRILHA', trilhaId, prazo })
  }

  const ids = { trilha: `${idBase}-trilha`, prazo: `${idBase}-prazo` }

  return (
    <form
      className={`${styles.form} ${styles.compacto}`}
      onSubmit={enviar}
      noValidate
      aria-label={`Ligar trilha a ${competencia}`}
    >
      {erro && (
        <p className={dialogo.erro} role="alert">
          {erro}
        </p>
      )}

      <Campo id={ids.trilha} rotulo="Trilha" erro={erroDoCampo('trilhaId')}>
        <select
          id={ids.trilha}
          name="trilhaId"
          value={trilhaId}
          onChange={(evento) => {
            setTrilhaId(evento.target.value)
            setErrosLocais(({ trilhaId: _removido, ...resto }) => resto)
          }}
          disabled={salvando}
          aria-required="true"
          {...ariaDoCampo(ids.trilha, erroDoCampo('trilhaId'))}
        >
          <option value="">Selecione</option>
          {trilhas.map((trilha) => (
            <option key={trilha.id} value={trilha.id}>
              {trilha.nome}
            </option>
          ))}
        </select>
      </Campo>

      <Campo id={ids.prazo} rotulo="Prazo" erro={erroDoCampo('prazo')}>
        <input
          id={ids.prazo}
          name="prazo"
          type="date"
          value={prazo}
          onChange={(evento) => {
            setPrazo(evento.target.value)
            setErrosLocais(({ prazo: _removido, ...resto }) => resto)
          }}
          disabled={salvando}
          aria-required="true"
          {...ariaDoCampo(ids.prazo, erroDoCampo('prazo'))}
        />
      </Campo>

      <div className={styles.acoes}>
        <button type="submit" className={dialogo.cancelar} disabled={salvando}>
          {salvando ? 'Ligando…' : 'Ligar trilha'}
        </button>
      </div>
    </form>
  )
}
