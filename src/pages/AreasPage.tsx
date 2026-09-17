import { useEffect, useState, type FormEvent } from 'react'
import { AreaFormulario } from '../components/areas/AreaFormulario.tsx'
import { AreasTabela } from '../components/areas/AreasTabela.tsx'
import { Paginacao } from '../components/areas/Paginacao.tsx'
import {
  ativarArea,
  atualizarArea,
  AreaServiceError,
  criarArea,
  inativarArea,
  listarAreas,
} from '../services/areaService.ts'
import type { ApiFieldError } from '../types/api.ts'
import type {
  Area,
  AtualizarAreaRequest,
  CriarAreaRequest,
  Pagina,
} from '../types/area.ts'
import styles from './AreasPage.module.css'

const TAMANHO_PAGINA = 10

/**
 * Listagem de áreas: busca por nome, paginação, cadastro/edição em modal e
 * inativação/reativação com recarga automática.
 *
 * A página é a única dona da comunicação com a API — tabela e formulário só
 * apresentam e avisam a intenção. Todo acesso passa pelo `areaService`;
 * nenhum componente chama o Axios.
 */
interface ResultadoBusca {
  /** Identifica a busca que produziu este resultado (nome + página + recarga). */
  chave: string
  dados: Pagina<Area> | null
  erro: string | null
}

function mensagemDe(causa: unknown, padrao: string): string {
  return causa instanceof AreaServiceError ? causa.message : padrao
}

export function AreasPage() {
  // `nomeDigitado` é o que está no campo; `nomeBuscado` é o que foi buscado.
  // Separar os dois evita uma requisição por tecla digitada.
  const [nomeDigitado, setNomeDigitado] = useState('')
  const [nomeBuscado, setNomeBuscado] = useState('')
  const [pagina, setPagina] = useState(0)
  const [recarga, setRecarga] = useState(0)

  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)

  const [formularioAberto, setFormularioAberto] = useState(false)
  const [areaEmEdicao, setAreaEmEdicao] = useState<Area | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])

  const [situacaoEmAndamento, setSituacaoEmAndamento] = useState<string | null>(
    null,
  )
  const [aviso, setAviso] = useState<string | null>(null)
  const [erroOperacao, setErroOperacao] = useState<string | null>(null)

  const chaveBusca = JSON.stringify([nomeBuscado, pagina, recarga])

  // `carregando` é derivado: o resultado em mãos é de outra busca, então a
  // que vale ainda está em voo.
  const carregando = resultado?.chave !== chaveBusca
  const erroBusca = resultado?.chave === chaveBusca ? resultado.erro : null
  const dados = resultado?.chave === chaveBusca ? resultado.dados : null

  useEffect(() => {
    const controlador = new AbortController()

    listarAreas(
      { nome: nomeBuscado },
      { page: pagina, size: TAMANHO_PAGINA },
      { signal: controlador.signal },
    )
      .then((busca) => {
        if (!controlador.signal.aborted) {
          setResultado({ chave: chaveBusca, dados: busca, erro: null })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setResultado({
            chave: chaveBusca,
            dados: null,
            erro: mensagemDe(causa, 'Não foi possível carregar as áreas.'),
          })
        }
      })

    return () => controlador.abort()
  }, [chaveBusca, nomeBuscado, pagina])

  function recarregar() {
    setRecarga((atual) => atual + 1)
  }

  function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPagina(0)
    setNomeBuscado(nomeDigitado)
  }

  function limparBusca() {
    setNomeDigitado('')
    setPagina(0)
    setNomeBuscado('')
  }

  function abrirFormulario(area: Area | null) {
    setAreaEmEdicao(area)
    setErroFormulario(null)
    setFieldErrors([])
    setFormularioAberto(true)
  }

  function fecharFormulario() {
    setFormularioAberto(false)
    setAreaEmEdicao(null)
    setErroFormulario(null)
    setFieldErrors([])
  }

  function registrarErroDoFormulario(causa: unknown, padrao: string) {
    if (causa instanceof AreaServiceError) {
      setErroFormulario(causa.message)
      setFieldErrors(causa.fieldErrors)
      return
    }
    setErroFormulario(padrao)
    setFieldErrors([])
  }

  async function cadastrar(request: CriarAreaRequest) {
    setSalvando(true)
    setErroFormulario(null)
    setFieldErrors([])
    try {
      await criarArea(request)
      fecharFormulario()
      setAviso('Área cadastrada.')
      setPagina(0)
      recarregar()
    } catch (causa) {
      registrarErroDoFormulario(causa, 'Não foi possível cadastrar a área.')
    } finally {
      setSalvando(false)
    }
  }

  async function salvarEdicao(id: string, request: AtualizarAreaRequest) {
    setSalvando(true)
    setErroFormulario(null)
    setFieldErrors([])
    try {
      await atualizarArea(id, request)
      fecharFormulario()
      setAviso('Área atualizada.')
      recarregar()
    } catch (causa) {
      registrarErroDoFormulario(causa, 'Não foi possível salvar as alterações.')
    } finally {
      setSalvando(false)
    }
  }

  async function alternarSituacao(area: Area) {
    setSituacaoEmAndamento(area.id)
    setErroOperacao(null)
    try {
      if (area.ativo) {
        await inativarArea(area.id)
        setAviso('Área inativada.')
      } else {
        await ativarArea(area.id)
        setAviso('Área reativada.')
      }
      recarregar()
    } catch (causa) {
      setErroOperacao(
        mensagemDe(causa, 'Não foi possível alterar a situação da área.'),
      )
    } finally {
      setSituacaoEmAndamento(null)
    }
  }

  const areas = dados?.content ?? []
  const listaVazia = !carregando && erroBusca === null && areas.length === 0

  return (
    <div className={styles.page}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Áreas</h1>
          <p className={styles.hint}>
            As áreas cadastradas aqui alimentam os cadastros de pessoas e de
            conteúdo.
          </p>
        </div>
        <button
          type="button"
          className={styles.novo}
          onClick={() => abrirFormulario(null)}
        >
          + Nova área
        </button>
      </header>

      {/* Live region só da página: avisos de sucesso chegam a quem usa leitor
          de tela sem mover o foco. */}
      <div role="status" aria-live="polite" className={styles.avisoRegiao}>
        {aviso && <p className={styles.aviso}>{aviso}</p>}
      </div>

      {erroOperacao && (
        <p className={styles.erro} role="alert">
          {erroOperacao}
        </p>
      )}

      <form className={styles.busca} onSubmit={buscar}>
        <label htmlFor="busca-area" className="visually-hidden">
          Buscar área por nome
        </label>
        <input
          id="busca-area"
          type="search"
          placeholder="Buscar por nome..."
          value={nomeDigitado}
          onChange={(event) => setNomeDigitado(event.target.value)}
        />
        <button type="submit">Buscar</button>
        {nomeBuscado && (
          <button type="button" onClick={limparBusca}>
            Limpar
          </button>
        )}
      </form>

      {formularioAberto && (
        <AreaFormulario
          area={areaEmEdicao}
          salvando={salvando}
          erro={erroFormulario}
          fieldErrors={fieldErrors}
          onCriar={(request) => void cadastrar(request)}
          onAtualizar={(id, request) => void salvarEdicao(id, request)}
          onFechar={fecharFormulario}
        />
      )}

      {carregando && (
        <p role="status" className={styles.estado}>
          Carregando áreas…
        </p>
      )}

      {erroBusca && (
        <div className={styles.erro} role="alert">
          <p>{erroBusca}</p>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {listaVazia && (
        <p className={styles.estado}>
          Nenhuma área encontrada{nomeBuscado && ' com esse nome'}.
        </p>
      )}

      {!carregando && erroBusca === null && areas.length > 0 && (
        <>
          <AreasTabela
            areas={areas}
            situacaoEmAndamento={situacaoEmAndamento}
            onEditar={abrirFormulario}
            onAlterarSituacao={(area) => void alternarSituacao(area)}
          />
          <Paginacao
            pagina={dados?.page.number ?? 0}
            totalPaginas={dados?.page.totalPages ?? 1}
            totalElementos={dados?.page.totalElements ?? 0}
            onIrPara={setPagina}
            desabilitado={carregando}
          />
        </>
      )}
    </div>
  )
}
