import { useId, useState, type FormEvent } from 'react'
import type { ApiFieldError } from '../../types/api.ts'
import {
  ROTULOS_TIPO_COMPETENCIA,
  type CompetenciaRequest,
  type TipoCompetencia,
} from '../../types/competencia.ts'
import { ariaDoCampo } from './campo.ts'
import { Campo, Dialogo } from './Dialogo.tsx'
import styles from './Dialogo.module.css'

interface CompetenciaFormularioProps {
  salvando: boolean
  erro: string | null
  fieldErrors: ApiFieldError[]
  onCriar: (request: CompetenciaRequest) => void
  onFechar: () => void
}

const NOME_MAX = 150

interface Campos {
  nome: string
  tipo: TipoCompetencia | ''
  descricao: string
}

type ErrosLocais = Partial<Record<keyof Campos, string>>

/**
 * Diálogo "Nova competência", aberto de dentro do editor do PDI para não
 * obrigar a sair da tela. Nome repetido no tenant volta 409 da API e aparece
 * em `erro`.
 */
export function CompetenciaFormulario({
  salvando,
  erro,
  fieldErrors,
  onCriar,
  onFechar,
}: CompetenciaFormularioProps) {
  const idBase = useId()
  const [campos, setCampos] = useState<Campos>({
    nome: '',
    tipo: '',
    descricao: '',
  })
  const [errosLocais, setErrosLocais] = useState<ErrosLocais>({})

  function erroDoCampo(campo: keyof Campos): string | undefined {
    return (
      fieldErrors.find((item) => item.field === campo)?.message ??
      errosLocais[campo]
    )
  }

  function alterar(campo: keyof Campos, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }))
    if (errosLocais[campo]) {
      setErrosLocais((atual) => ({ ...atual, [campo]: undefined }))
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const erros: ErrosLocais = {}
    if (campos.nome.trim() === '') {
      erros.nome = 'Informe o nome da competência.'
    }
    if (campos.tipo === '') {
      erros.tipo = 'Escolha o tipo.'
    }
    setErrosLocais(erros)
    if (Object.keys(erros).length > 0 || campos.tipo === '') {
      return
    }
    const descricao = campos.descricao.trim()
    onCriar({
      nome: campos.nome.trim(),
      tipo: campos.tipo,
      descricao: descricao === '' ? null : descricao,
    })
  }

  const ids = {
    nome: `${idBase}-nome`,
    tipo: `${idBase}-tipo`,
    descricao: `${idBase}-descricao`,
  }

  return (
    <Dialogo
      titulo="Nova competência"
      subtitulo="A competência entra no catálogo da empresa e pode ser usada em qualquer PDI."
      ocupado={salvando}
      onFechar={onFechar}
    >
      <form className={styles.form} onSubmit={enviar} noValidate>
        {erro && (
          <p className={styles.erro} role="alert">
            {erro}
          </p>
        )}

        <Campo id={ids.nome} rotulo="Nome" erro={erroDoCampo('nome')} cheio>
          <input
            id={ids.nome}
            name="nome"
            type="text"
            placeholder="Ex.: Comunicação"
            maxLength={NOME_MAX}
            value={campos.nome}
            onChange={(evento) => alterar('nome', evento.target.value)}
            disabled={salvando}
            aria-required="true"
            {...ariaDoCampo(ids.nome, erroDoCampo('nome'))}
          />
        </Campo>

        <Campo id={ids.tipo} rotulo="Tipo" erro={erroDoCampo('tipo')} cheio>
          <select
            id={ids.tipo}
            name="tipo"
            value={campos.tipo}
            onChange={(evento) => alterar('tipo', evento.target.value)}
            disabled={salvando}
            aria-required="true"
            {...ariaDoCampo(ids.tipo, erroDoCampo('tipo'))}
          >
            <option value="">Selecione</option>
            {(Object.keys(ROTULOS_TIPO_COMPETENCIA) as TipoCompetencia[]).map(
              (tipo) => (
                <option key={tipo} value={tipo}>
                  {ROTULOS_TIPO_COMPETENCIA[tipo]}
                </option>
              ),
            )}
          </select>
        </Campo>

        <Campo
          id={ids.descricao}
          rotulo="Descrição (opcional)"
          erro={erroDoCampo('descricao')}
          cheio
        >
          <textarea
            id={ids.descricao}
            name="descricao"
            rows={3}
            value={campos.descricao}
            onChange={(evento) => alterar('descricao', evento.target.value)}
            disabled={salvando}
            {...ariaDoCampo(ids.descricao, erroDoCampo('descricao'))}
          />
        </Campo>

        <div className={styles.rodape}>
          <button
            type="button"
            className={styles.cancelar}
            onClick={onFechar}
            disabled={salvando}
          >
            Cancelar
          </button>
          <button type="submit" className={styles.criar} disabled={salvando}>
            {salvando ? 'Criando…' : 'Criar competência'}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}
