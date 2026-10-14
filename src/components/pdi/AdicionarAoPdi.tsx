import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { caminhoPdi } from '../../routes/paths.ts'
import {
  buscarPdi,
  ligarTrilha,
  listarPdis,
  PdiServiceError,
} from '../../services/pdiService.ts'
import type { ApiFieldError } from '../../types/api.ts'
import type { PdiDetalhe, PdiResumo } from '../../types/pdi.ts'
import { ariaDoCampo } from './campo.ts'
import { Campo, Dialogo } from './Dialogo.tsx'
import styles from './Dialogo.module.css'

interface AdicionarAoPdiProps {
  trilha: { id: string; nome: string }
  onAdicionada: (mensagem: string) => void
  onFechar: () => void
}

function mensagemDe(causa: unknown, padrao: string): string {
  return causa instanceof PdiServiceError ? causa.message : padrao
}

/**
 * "Adicionar ao PDI" do detalhe da trilha (ADMIN e GESTOR): escolhe o PDI
 * ativo de um colaborador, a competência desse PDI e o prazo. A API liga a
 * trilha à competência e a atribui ao colaborador.
 */
export function AdicionarAoPdi({
  trilha,
  onAdicionada,
  onFechar,
}: AdicionarAoPdiProps) {
  const idBase = useId()
  const [pdis, setPdis] = useState<PdiResumo[] | null>(null)
  const [pdiId, setPdiId] = useState('')
  const [pdi, setPdi] = useState<PdiDetalhe | null>(null)
  const [itemId, setItemId] = useState('')
  const [prazo, setPrazo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])
  const [errosLocais, setErrosLocais] = useState<Record<string, string>>({})

  // Só PDIs ativos recebem trilhas novas.
  useEffect(() => {
    let ativo = true
    listarPdis({ page: 0, size: 100 })
      .then((pagina) => {
        if (ativo) {
          setPdis(pagina.content.filter((item) => item.status === 'ATIVO'))
        }
      })
      .catch((causa: unknown) => {
        if (ativo) {
          setPdis([])
          setErro(mensagemDe(causa, 'Não foi possível carregar os PDIs.'))
        }
      })
    return () => {
      ativo = false
    }
  }, [])

  // As competências vêm do PDI escolhido.
  useEffect(() => {
    if (pdiId === '') {
      return
    }
    let ativo = true
    buscarPdi(pdiId)
      .then((detalhe) => {
        if (ativo) {
          setPdi(detalhe)
        }
      })
      .catch((causa: unknown) => {
        if (ativo) {
          setErro(mensagemDe(causa, 'Não foi possível carregar o PDI.'))
        }
      })
    return () => {
      ativo = false
    }
  }, [pdiId])

  function erroDoCampo(campo: string): string | undefined {
    return (
      fieldErrors.find((item) => item.field === campo)?.message ??
      errosLocais[campo]
    )
  }

  function escolherPdi(id: string) {
    setPdiId(id)
    setPdi(null)
    setItemId('')
    setErro(null)
    setErrosLocais({})
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const erros: Record<string, string> = {}
    if (pdiId === '') {
      erros.pdiId = 'Escolha o PDI.'
    }
    if (itemId === '') {
      erros.itemId = 'Escolha a competência.'
    }
    if (prazo === '') {
      erros.prazo = 'Informe o prazo.'
    }
    setErrosLocais(erros)
    if (Object.keys(erros).length > 0) {
      return
    }

    setSalvando(true)
    setErro(null)
    setFieldErrors([])
    try {
      await ligarTrilha(pdiId, itemId, {
        tipo: 'TRILHA',
        trilhaId: trilha.id,
        prazo,
      })
      const colaborador = pdis?.find((item) => item.id === pdiId)?.colaborador
      onAdicionada(
        `Trilha adicionada ao PDI de ${colaborador?.nomeCompleto ?? 'colaborador'}.`,
      )
    } catch (causa) {
      setErro(mensagemDe(causa, 'Não foi possível ligar a trilha ao PDI.'))
      setFieldErrors(causa instanceof PdiServiceError ? causa.fieldErrors : [])
      setSalvando(false)
    }
  }

  const ids = {
    pdi: `${idBase}-pdi`,
    item: `${idBase}-item`,
    prazo: `${idBase}-prazo`,
  }
  const semCompetencias = pdi !== null && pdi.itens.length === 0

  return (
    <Dialogo
      titulo="Adicionar ao PDI"
      subtitulo={`Ligue “${trilha.nome}” a uma competência do PDI de um colaborador. A trilha é atribuída a ele com o prazo escolhido.`}
      ocupado={salvando}
      onFechar={onFechar}
    >
      <form className={styles.form} onSubmit={(e) => void enviar(e)} noValidate>
        {erro && (
          <p className={styles.erro} role="alert">
            {erro}
          </p>
        )}

        <Campo id={ids.pdi} rotulo="PDI" erro={erroDoCampo('pdiId')} cheio>
          <select
            id={ids.pdi}
            name="pdiId"
            value={pdiId}
            onChange={(evento) => escolherPdi(evento.target.value)}
            disabled={salvando || pdis === null}
            aria-required="true"
            {...ariaDoCampo(ids.pdi, erroDoCampo('pdiId'))}
          >
            <option value="">
              {pdis === null ? 'Carregando…' : 'Selecione'}
            </option>
            {pdis?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.colaborador.nomeCompleto} — ciclo {item.ciclo}
              </option>
            ))}
          </select>
          {pdis !== null && pdis.length === 0 && (
            <p className={styles.dica}>
              Nenhum PDI ativo disponível para você.
            </p>
          )}
        </Campo>

        <Campo
          id={ids.item}
          rotulo="Competência"
          erro={erroDoCampo('itemId')}
          cheio
        >
          <select
            id={ids.item}
            name="itemId"
            value={itemId}
            onChange={(evento) => setItemId(evento.target.value)}
            disabled={salvando || pdi === null || semCompetencias}
            aria-required="true"
            {...ariaDoCampo(ids.item, erroDoCampo('itemId'))}
          >
            <option value="">
              {pdiId !== '' && pdi === null ? 'Carregando…' : 'Selecione'}
            </option>
            {pdi?.itens.map((item) => (
              <option key={item.id} value={item.id}>
                {item.competencia.nome}
              </option>
            ))}
          </select>
          {semCompetencias && (
            <p className={styles.dica}>
              Esse PDI ainda não tem competências.{' '}
              <Link to={caminhoPdi(pdiId)}>Abrir o editor do PDI</Link>
            </p>
          )}
        </Campo>

        <Campo id={ids.prazo} rotulo="Prazo" erro={erroDoCampo('prazo')} cheio>
          <input
            id={ids.prazo}
            name="prazo"
            type="date"
            value={prazo}
            onChange={(evento) => setPrazo(evento.target.value)}
            disabled={salvando}
            aria-required="true"
            {...ariaDoCampo(ids.prazo, erroDoCampo('prazo'))}
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
            {salvando ? 'Adicionando…' : 'Adicionar ao PDI'}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}
