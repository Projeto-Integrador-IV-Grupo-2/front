import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { caminhoPdi } from '../../routes/paths.ts'
import {
  criarPdi,
  listarColaboradores,
  listarPdis,
  PdiServiceError,
} from '../../services/pdiService.ts'
import type { ApiFieldError } from '../../types/api.ts'
import type {
  ColaboradorOpcao,
  CriarPdiRequest,
  PdiResumo,
} from '../../types/pdi.ts'
import type { Pagina } from '../../types/usuario.ts'
import { BarraProgresso } from '../trilhas/StatusProgresso.tsx'
import { PdiFormulario } from './PdiFormulario.tsx'
import { SeloStatusPdi } from './PdiResumoPainel.tsx'
import estados from './Estados.module.css'
import styles from './PdisEquipe.module.css'

const TAMANHO_PAGINA = 20

interface Resultado {
  chave: number
  paginas: Pagina<PdiResumo>[]
  erro: string | null
}

function mensagemDe(causa: unknown, padrao: string): string {
  return causa instanceof PdiServiceError ? causa.message : padrao
}

/**
 * Aba "PDIs da equipe" (ADMIN e GESTOR): colaborador, ciclo, status e
 * percentual de cada PDI que a API deixa ver — o gestor recebe só os PDIs em
 * que é o gestor. Daqui também se cria um PDI, que abre direto no editor.
 */
export function PdisEquipe() {
  const navigate = useNavigate()
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroMais, setErroMais] = useState<string | null>(null)

  const [formularioAberto, setFormularioAberto] = useState(false)
  const [colaboradores, setColaboradores] = useState<ColaboradorOpcao[] | null>(
    null,
  )
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])
  const novoRef = useRef<HTMLButtonElement>(null)

  const carregando = resultado?.chave !== recarga
  const erroBusca = resultado?.chave === recarga ? resultado.erro : null
  const paginas = resultado?.chave === recarga ? resultado.paginas : []

  useEffect(() => {
    const controlador = new AbortController()
    listarPdis(
      { page: 0, size: TAMANHO_PAGINA },
      { signal: controlador.signal },
    )
      .then((pagina) => {
        if (!controlador.signal.aborted) {
          setResultado({ chave: recarga, paginas: [pagina], erro: null })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setResultado({
            chave: recarga,
            paginas: [],
            erro: mensagemDe(causa, 'Não foi possível carregar os PDIs.'),
          })
        }
      })
    return () => controlador.abort()
  }, [recarga])

  // Os colaboradores só são buscados na primeira vez que o formulário abre.
  useEffect(() => {
    if (!formularioAberto || colaboradores !== null) {
      return
    }
    let ativo = true
    listarColaboradores()
      .then((lista) => {
        if (ativo) {
          setColaboradores(lista)
        }
      })
      .catch((causa: unknown) => {
        if (ativo) {
          setColaboradores([])
          setErroFormulario(
            mensagemDe(causa, 'Não foi possível carregar os colaboradores.'),
          )
        }
      })
    return () => {
      ativo = false
    }
  }, [formularioAberto, colaboradores])

  const pdis = paginas.flatMap((pagina) => pagina.content)
  const ultima = paginas[paginas.length - 1]
  const temMais =
    ultima !== undefined && ultima.page.number < ultima.page.totalPages - 1

  async function carregarMais() {
    if (!ultima || carregandoMais) {
      return
    }
    const chave = recarga
    setCarregandoMais(true)
    setErroMais(null)
    try {
      const proxima = await listarPdis({
        page: ultima.page.number + 1,
        size: TAMANHO_PAGINA,
      })
      setResultado((atual) =>
        atual && atual.chave === chave
          ? { ...atual, paginas: [...atual.paginas, proxima] }
          : atual,
      )
    } catch (causa) {
      setErroMais(mensagemDe(causa, 'Não foi possível carregar mais PDIs.'))
    } finally {
      setCarregandoMais(false)
    }
  }

  function abrirFormulario() {
    setErroFormulario(null)
    setFieldErrors([])
    setFormularioAberto(true)
  }

  function fecharFormulario() {
    setFormularioAberto(false)
    setErroFormulario(null)
    setFieldErrors([])
    novoRef.current?.focus()
  }

  async function cadastrar(request: CriarPdiRequest) {
    setSalvando(true)
    setErroFormulario(null)
    setFieldErrors([])
    try {
      const pdi = await criarPdi(request)
      // O próximo passo é montar as competências: vai direto ao editor.
      navigate(caminhoPdi(pdi.id))
    } catch (causa) {
      setErroFormulario(mensagemDe(causa, 'Não foi possível criar o PDI.'))
      setFieldErrors(causa instanceof PdiServiceError ? causa.fieldErrors : [])
      setSalvando(false)
    }
  }

  return (
    <>
      <div className={styles.barra}>
        <p className={styles.dica}>
          Acompanhe o plano de cada colaborador e monte novos PDIs.
        </p>
        <button
          ref={novoRef}
          type="button"
          className={estados.botao}
          onClick={abrirFormulario}
        >
          Novo PDI
        </button>
      </div>

      {carregando && (
        <p role="status" className={estados.carregando}>
          Carregando PDIs…
        </p>
      )}

      {erroBusca && (
        <div className={estados.erro} role="alert">
          <p>{erroBusca}</p>
          <button type="button" onClick={() => setRecarga((n) => n + 1)}>
            Tentar novamente
          </button>
        </div>
      )}

      {!carregando && erroBusca === null && pdis.length === 0 && (
        <div className={estados.vazio}>
          <p className={estados.vazioTitulo}>Nenhum PDI por aqui ainda</p>
          <p className={estados.vazioTexto}>
            Crie o primeiro PDI para começar a acompanhar o desenvolvimento da
            equipe.
          </p>
        </div>
      )}

      {!carregando && erroBusca === null && pdis.length > 0 && (
        <>
          <ul className={estados.lista} aria-label="PDIs da equipe">
            {pdis.map((pdi) => (
              <li key={pdi.id} className={styles.linha}>
                <div className={styles.quem}>
                  <Link to={caminhoPdi(pdi.id)} className={styles.nome}>
                    {pdi.colaborador.nomeCompleto}
                  </Link>
                  <span className={styles.ciclo}>Ciclo {pdi.ciclo}</span>
                </div>
                <SeloStatusPdi status={pdi.status} />
                <div className={styles.progresso}>
                  <BarraProgresso
                    percentual={pdi.percentual}
                    rotulo={`Progresso do PDI de ${pdi.colaborador.nomeCompleto}`}
                  />
                </div>
              </li>
            ))}
          </ul>
          {erroMais && (
            <p className={styles.erroMais} role="alert">
              {erroMais}
            </p>
          )}
          {temMais && (
            <button
              type="button"
              className={estados.botaoSecundario}
              onClick={() => void carregarMais()}
              disabled={carregandoMais}
            >
              {carregandoMais ? 'Carregando…' : 'Carregar mais PDIs'}
            </button>
          )}
        </>
      )}

      {formularioAberto && (
        <PdiFormulario
          colaboradores={colaboradores}
          salvando={salvando}
          erro={erroFormulario}
          fieldErrors={fieldErrors}
          onCriar={(request) => void cadastrar(request)}
          onFechar={fecharFormulario}
        />
      )}
    </>
  )
}
