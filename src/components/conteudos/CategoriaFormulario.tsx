import { useId, useState, type FormEvent } from 'react'
import type { ApiFieldError } from '../../types/api.ts'
import type { Categoria, CategoriaRequest } from '../../types/conteudo.ts'
import { erroDoCampo } from './erroDoCampo.ts'
import { Modal } from './Modal.tsx'
import styles from './Modal.module.css'

interface CategoriaFormularioProps {
  /** `null` = cadastro; preenchida = edição. */
  categoria: Categoria | null
  salvando: boolean
  erro: string | null
  fieldErrors: ApiFieldError[]
  onSalvar: (request: CategoriaRequest) => void
  onFechar: () => void
}

/** Cadastro e edição de categoria. Nome duplicado vem da API (409). */
export function CategoriaFormulario({
  categoria,
  salvando,
  erro,
  fieldErrors,
  onSalvar,
  onFechar,
}: CategoriaFormularioProps) {
  const nomeId = useId()
  const descricaoId = useId()
  const [nome, setNome] = useState(categoria?.nome ?? '')
  const [descricao, setDescricao] = useState(categoria?.descricao ?? '')
  const [erroNome, setErroNome] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (salvando) {
      return
    }
    if (!nome.trim()) {
      setErroNome('Informe o nome da categoria.')
      return
    }
    setErroNome(null)
    onSalvar({ nome: nome.trim(), descricao: descricao.trim() || null })
  }

  const mensagemNome = erroNome ?? erroDoCampo(fieldErrors, 'nome')

  return (
    <Modal
      titulo={categoria ? 'Editar categoria' : 'Nova categoria'}
      subtitulo="Categorias agrupam os conteúdos de estudo."
      onFechar={onFechar}
    >
      {() => (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.campo}>
            <label htmlFor={nomeId}>Nome</label>
            <input
              id={nomeId}
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Ex.: Onboarding"
              aria-invalid={Boolean(mensagemNome)}
              disabled={salvando}
            />
            {mensagemNome && (
              <span className={styles.erroCampo} role="alert">
                {mensagemNome}
              </span>
            )}
          </div>
          <div className={styles.campo}>
            <label htmlFor={descricaoId}>Descrição</label>
            <textarea
              id={descricaoId}
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
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
              className={styles.cancelar}
              onClick={onFechar}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.salvar} disabled={salvando}>
              {salvando
                ? 'Salvando...'
                : categoria
                  ? 'Salvar alterações'
                  : 'Cadastrar categoria'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
