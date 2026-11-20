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
 * Liga uma trilha a uma competência do PDI e salva na hora. O prazo não é
 * pedido aqui: vale o que a trilha define (a API atribui a trilha ao
 * colaborador com esse prazo, sem duplicar se ele já tiver a trilha).
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
    setErrosLocais(erros)
    if (Object.keys(erros).length > 0) {
      return
    }
    onLigar({ tipo: 'TRILHA', trilhaId })
  }

  const ids = { trilha: `${idBase}-trilha` }

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

      <div className={styles.acoes}>
        <button
          type="submit"
          className={dialogo.criar}
          disabled={salvando || trilhaId === ''}
        >
          {salvando ? 'Salvando…' : 'Salvar trilha'}
        </button>
      </div>
    </form>
  )
}
