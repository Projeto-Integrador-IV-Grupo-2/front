import { useEffect, useId, useState, type FormEvent } from 'react'
import type { ApiFieldError } from '../../types/api.ts'
import type {
  Area,
  AtualizarAreaRequest,
  CriarAreaRequest,
} from '../../types/area.ts'
import styles from './AreaFormulario.module.css'

interface AreaFormularioProps {
  /** `null` = cadastro; preenchido = edição do mesmo painel. */
  area: Area | null
  salvando: boolean
  erro: string | null
  fieldErrors: ApiFieldError[]
  onCriar: (request: CriarAreaRequest) => void
  onAtualizar: (id: string, request: AtualizarAreaRequest) => void
  onFechar: () => void
}

function erroDoCampo(
  fieldErrors: ApiFieldError[],
  campo: string,
): string | undefined {
  return fieldErrors.find((erro) => erro.field === campo)?.message
}

/**
 * Painel de criação/edição de área, em modal — só apresenta e valida
 * formato: nome duplicado e outras regras de negócio vêm da API (`erro` e
 * `fieldErrors`), nunca reimplementadas aqui.
 */
export function AreaFormulario({
  area,
  salvando,
  erro,
  fieldErrors,
  onCriar,
  onAtualizar,
  onFechar,
}: AreaFormularioProps) {
  const tituloId = useId()
  const nomeId = useId()
  const descricaoId = useId()

  const [nome, setNome] = useState(area?.nome ?? '')
  const [descricao, setDescricao] = useState(area?.descricao ?? '')
  const [erroNome, setErroNome] = useState<string | null>(null)

  useEffect(() => {
    function fecharComEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onFechar()
      }
    }
    document.addEventListener('keydown', fecharComEsc)
    return () => document.removeEventListener('keydown', fecharComEsc)
  }, [onFechar])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (salvando) {
      return
    }

    if (!nome.trim()) {
      setErroNome('Informe o nome da área.')
      return
    }
    setErroNome(null)

    const request = { nome: nome.trim(), descricao: descricao.trim() || null }
    if (area) {
      onAtualizar(area.id, request)
    } else {
      onCriar(request)
    }
  }

  const erroNomeApi = erroDoCampo(fieldErrors, 'nome')

  return (
    <div className={styles.backdrop} onClick={onFechar}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.cabecalho}>
          <div>
            <h2 id={tituloId}>{area ? 'Editar área' : 'Nova área'}</h2>
            <p className={styles.subtitulo}>
              {area
                ? 'Altere os dados da área.'
                : 'Áreas são usadas nos cadastros de pessoas, conteúdos e trilhas.'}
            </p>
          </div>
          <button
            type="button"
            className={styles.fechar}
            onClick={onFechar}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.campo}>
            <label htmlFor={nomeId}>Nome da área</label>
            <input
              id={nomeId}
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Ex.: Marketing"
              aria-invalid={Boolean(erroNome || erroNomeApi)}
              disabled={salvando}
            />
            {(erroNome ?? erroNomeApi) && (
              <span className={styles.erroCampo} role="alert">
                {erroNome ?? erroNomeApi}
              </span>
            )}
          </div>

          <div className={styles.campo}>
            <label htmlFor={descricaoId}>Descrição</label>
            <textarea
              id={descricaoId}
              value={descricao ?? ''}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="O que essa área faz?"
              rows={3}
              disabled={salvando}
            />
          </div>

          {erro && (
            <p className={styles.erroFormulario} role="alert">
              {erro}
            </p>
          )}

          <div className={styles.acoes}>
            <button
              type="button"
              onClick={onFechar}
              className={styles.cancelar}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.salvar} disabled={salvando}>
              {salvando
                ? 'Salvando...'
                : area
                  ? 'Salvar alterações'
                  : 'Cadastrar área'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
