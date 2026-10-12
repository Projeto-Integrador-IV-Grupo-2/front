import { useId, useState, type FormEvent } from 'react'
import type { ApiFieldError } from '../../types/api.ts'
import type { ColaboradorOpcao, CriarPdiRequest } from '../../types/pdi.ts'
import { ariaDoCampo } from './campo.ts'
import { Campo, Dialogo } from './Dialogo.tsx'
import styles from './Dialogo.module.css'

interface PdiFormularioProps {
  /** `null` enquanto a lista carrega. */
  colaboradores: ColaboradorOpcao[] | null
  salvando: boolean
  erro: string | null
  fieldErrors: ApiFieldError[]
  onCriar: (request: CriarPdiRequest) => void
  onFechar: () => void
}

const CICLO_MAX = 20

interface Campos {
  colaboradorId: string
  ciclo: string
  inicio: string
  fim: string
}

type ErrosLocais = Partial<Record<keyof Campos, string>>

function validar(campos: Campos): ErrosLocais {
  const erros: ErrosLocais = {}
  if (campos.colaboradorId === '') {
    erros.colaboradorId = 'Escolha o colaborador.'
  }
  if (campos.ciclo.trim() === '') {
    erros.ciclo = 'Informe o ciclo.'
  }
  if (campos.inicio === '') {
    erros.inicio = 'Informe o início.'
  }
  if (campos.fim === '') {
    erros.fim = 'Informe o fim.'
  } else if (campos.inicio !== '' && campos.fim < campos.inicio) {
    erros.fim = 'O fim não pode ser antes do início.'
  }
  return erros
}

/**
 * Diálogo "Novo PDI": colaborador, ciclo, início e fim. Não chama a API —
 * devolve o request para quem abriu, que cuida do envio e dos erros (ex.: o
 * 409 de PDI repetido no ciclo aparece em `erro`, com a mensagem da API).
 */
export function PdiFormulario({
  colaboradores,
  salvando,
  erro,
  fieldErrors,
  onCriar,
  onFechar,
}: PdiFormularioProps) {
  const idBase = useId()
  const [campos, setCampos] = useState<Campos>({
    colaboradorId: '',
    ciclo: String(new Date().getFullYear()),
    inicio: '',
    fim: '',
  })
  const [errosLocais, setErrosLocais] = useState<ErrosLocais>({})

  // O erro da API vence o local: é a resposta mais recente para o campo.
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
    const erros = validar(campos)
    setErrosLocais(erros)
    if (Object.keys(erros).length > 0) {
      return
    }
    onCriar({
      colaboradorId: campos.colaboradorId,
      ciclo: campos.ciclo.trim(),
      inicio: campos.inicio,
      fim: campos.fim,
    })
  }

  const ids = {
    colaborador: `${idBase}-colaborador`,
    ciclo: `${idBase}-ciclo`,
    inicio: `${idBase}-inicio`,
    fim: `${idBase}-fim`,
  }

  return (
    <Dialogo
      titulo="Novo PDI"
      subtitulo="Escolha o colaborador e o ciclo. As competências e trilhas entram depois, no editor."
      ocupado={salvando}
      onFechar={onFechar}
    >
      <form className={styles.form} onSubmit={enviar} noValidate>
        {erro && (
          <p className={styles.erro} role="alert">
            {erro}
          </p>
        )}

        <Campo
          id={ids.colaborador}
          rotulo="Colaborador"
          erro={erroDoCampo('colaboradorId')}
          cheio
        >
          <select
            id={ids.colaborador}
            name="colaboradorId"
            value={campos.colaboradorId}
            onChange={(evento) => alterar('colaboradorId', evento.target.value)}
            disabled={salvando || colaboradores === null}
            aria-required="true"
            {...ariaDoCampo(ids.colaborador, erroDoCampo('colaboradorId'))}
          >
            <option value="">
              {colaboradores === null ? 'Carregando…' : 'Selecione'}
            </option>
            {colaboradores?.map((colaborador) => (
              <option key={colaborador.id} value={colaborador.id}>
                {colaborador.nomeCompleto} ({colaborador.email})
              </option>
            ))}
          </select>
        </Campo>

        <Campo id={ids.ciclo} rotulo="Ciclo" erro={erroDoCampo('ciclo')} cheio>
          <input
            id={ids.ciclo}
            name="ciclo"
            type="text"
            placeholder="Ex.: 2026"
            maxLength={CICLO_MAX}
            value={campos.ciclo}
            onChange={(evento) => alterar('ciclo', evento.target.value)}
            disabled={salvando}
            aria-required="true"
            {...ariaDoCampo(ids.ciclo, erroDoCampo('ciclo'))}
          />
        </Campo>

        <Campo id={ids.inicio} rotulo="Início" erro={erroDoCampo('inicio')}>
          <input
            id={ids.inicio}
            name="inicio"
            type="date"
            value={campos.inicio}
            onChange={(evento) => alterar('inicio', evento.target.value)}
            disabled={salvando}
            aria-required="true"
            {...ariaDoCampo(ids.inicio, erroDoCampo('inicio'))}
          />
        </Campo>

        <Campo id={ids.fim} rotulo="Fim" erro={erroDoCampo('fim')}>
          <input
            id={ids.fim}
            name="fim"
            type="date"
            value={campos.fim}
            onChange={(evento) => alterar('fim', evento.target.value)}
            disabled={salvando}
            aria-required="true"
            {...ariaDoCampo(ids.fim, erroDoCampo('fim'))}
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
            {salvando ? 'Criando…' : 'Criar PDI'}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}
