import { useId, useState, type FormEvent } from 'react'
import type { ApiFieldError } from '../../types/api.ts'
import type { Competencia } from '../../types/competencia.ts'
import { NIVEIS, type PdiItemRequest } from '../../types/pdi.ts'
import { ariaDoCampo } from './campo.ts'
import { Campo } from './Dialogo.tsx'
import dialogo from './Dialogo.module.css'
import styles from './FormularioInline.module.css'

interface AdicionarCompetenciaFormProps {
  /** Competências ativas do catálogo, sem as que já estão no PDI. */
  competencias: Competencia[]
  salvando: boolean
  erro: string | null
  fieldErrors: ApiFieldError[]
  /** Competência recém-criada no diálogo: já vem selecionada. */
  selecionadaId: string
  onSelecionar: (id: string) => void
  onNovaCompetencia: () => void
  onAdicionar: (request: PdiItemRequest) => void
}

interface Campos {
  nivelAtual: string
  nivelAlvo: string
  observacao: string
}

/**
 * "Adicionar competência" do editor. Os níveis são selects de 1 a 5: a tela
 * não deixa escolher outro valor (a API também recusa com 400).
 */
export function AdicionarCompetenciaForm({
  competencias,
  salvando,
  erro,
  fieldErrors,
  selecionadaId,
  onSelecionar,
  onNovaCompetencia,
  onAdicionar,
}: AdicionarCompetenciaFormProps) {
  const idBase = useId()
  const [campos, setCampos] = useState<Campos>({
    nivelAtual: '',
    nivelAlvo: '',
    observacao: '',
  })
  const [errosLocais, setErrosLocais] = useState<Record<string, string>>({})

  function erroDoCampo(campo: string): string | undefined {
    return (
      fieldErrors.find((item) => item.field === campo)?.message ??
      errosLocais[campo]
    )
  }

  function alterar(campo: keyof Campos, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }))
    setErrosLocais(({ [campo]: _removido, ...resto }) => resto)
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const erros: Record<string, string> = {}
    if (selecionadaId === '') {
      erros.competenciaId = 'Escolha a competência.'
    }
    if (campos.nivelAtual === '') {
      erros.nivelAtual = 'Escolha o nível atual.'
    }
    if (campos.nivelAlvo === '') {
      erros.nivelAlvo = 'Escolha o nível alvo.'
    }
    setErrosLocais(erros)
    if (Object.keys(erros).length > 0) {
      return
    }
    const observacao = campos.observacao.trim()
    onAdicionar({
      competenciaId: selecionadaId,
      nivelAtual: Number(campos.nivelAtual),
      nivelAlvo: Number(campos.nivelAlvo),
      observacao: observacao === '' ? null : observacao,
    })
  }

  const ids = {
    competencia: `${idBase}-competencia`,
    atual: `${idBase}-atual`,
    alvo: `${idBase}-alvo`,
    observacao: `${idBase}-observacao`,
  }

  return (
    <form
      className={styles.form}
      onSubmit={enviar}
      noValidate
      aria-label="Adicionar competência"
    >
      {erro && (
        <p className={dialogo.erro} role="alert">
          {erro}
        </p>
      )}

      <Campo
        id={ids.competencia}
        rotulo="Competência"
        erro={erroDoCampo('competenciaId')}
        cheio
        acao={
          <button
            type="button"
            className={dialogo.link}
            onClick={onNovaCompetencia}
            disabled={salvando}
          >
            Nova competência
          </button>
        }
      >
        <select
          id={ids.competencia}
          name="competenciaId"
          value={selecionadaId}
          onChange={(evento) => {
            onSelecionar(evento.target.value)
            setErrosLocais(({ competenciaId: _removido, ...resto }) => resto)
          }}
          disabled={salvando}
          aria-required="true"
          {...ariaDoCampo(ids.competencia, erroDoCampo('competenciaId'))}
        >
          <option value="">Selecione</option>
          {competencias.map((competencia) => (
            <option key={competencia.id} value={competencia.id}>
              {competencia.nome}
            </option>
          ))}
        </select>
      </Campo>

      <Campo
        id={ids.atual}
        rotulo="Nível atual"
        erro={erroDoCampo('nivelAtual')}
      >
        <select
          id={ids.atual}
          name="nivelAtual"
          value={campos.nivelAtual}
          onChange={(evento) => alterar('nivelAtual', evento.target.value)}
          disabled={salvando}
          aria-required="true"
          {...ariaDoCampo(ids.atual, erroDoCampo('nivelAtual'))}
        >
          <option value="">Selecione</option>
          {NIVEIS.map((nivel) => (
            <option key={nivel} value={nivel}>
              {nivel}
            </option>
          ))}
        </select>
      </Campo>

      <Campo id={ids.alvo} rotulo="Nível alvo" erro={erroDoCampo('nivelAlvo')}>
        <select
          id={ids.alvo}
          name="nivelAlvo"
          value={campos.nivelAlvo}
          onChange={(evento) => alterar('nivelAlvo', evento.target.value)}
          disabled={salvando}
          aria-required="true"
          {...ariaDoCampo(ids.alvo, erroDoCampo('nivelAlvo'))}
        >
          <option value="">Selecione</option>
          {NIVEIS.map((nivel) => (
            <option key={nivel} value={nivel}>
              {nivel}
            </option>
          ))}
        </select>
      </Campo>

      <Campo
        id={ids.observacao}
        rotulo="Observação (opcional)"
        erro={erroDoCampo('observacao')}
        cheio
      >
        <textarea
          id={ids.observacao}
          name="observacao"
          rows={2}
          value={campos.observacao}
          onChange={(evento) => alterar('observacao', evento.target.value)}
          disabled={salvando}
          {...ariaDoCampo(ids.observacao, erroDoCampo('observacao'))}
        />
      </Campo>

      <div className={styles.acoes}>
        <button type="submit" className={dialogo.criar} disabled={salvando}>
          {salvando ? 'Adicionando…' : 'Adicionar competência'}
        </button>
      </div>
    </form>
  )
}
