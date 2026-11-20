import { useEffect, useState } from 'react'
import { AvisoSucesso } from '../components/comum/AvisoSucesso.tsx'
import { useSearchParams } from 'react-router-dom'
import { STATUS_PROGRESSO, type StatusProgresso } from '../types/trilha.ts'
import {
  AcompanhamentoFiltros,
  type ValoresFiltroAcompanhamento,
} from '../components/acompanhamento/AcompanhamentoFiltros.tsx'
import { AcompanhamentoTabela } from '../components/acompanhamento/AcompanhamentoTabela.tsx'
import { ColaboradorPainel } from '../components/acompanhamento/ColaboradorPainel.tsx'
import { Paginacao } from '../components/acompanhamento/Paginacao.tsx'
import { listarAreas } from '../services/areaService.ts'
import {
  AtribuicaoServiceError,
  buscarAcompanhamentoDoColaborador,
  exportarAcompanhamento,
  listarAtribuicoes,
} from '../services/atribuicaoService.ts'
import { listarTrilhas } from '../services/trilhaService.ts'
import type {
  AtribuicaoAcompanhamento,
  ColaboradorAcompanhamento,
  ColaboradorResumo,
} from '../types/atribuicao.ts'
import type { Pagina, RecursoResumo } from '../types/usuario.ts'
import { baixarArquivo } from '../utils/baixarArquivo.ts'
import styles from './AcompanhamentoPage.module.css'

const TAMANHO_PAGINA = 20
/** Quantas opções os selects de trilha e área carregam. */
const TAMANHO_OPCOES = 100

const FILTRO_VAZIO: ValoresFiltroAcompanhamento = {
  trilhaId: '',
  areaId: '',
  status: '',
}

interface ResultadoBusca {
  /** Identifica a busca que produziu este resultado (filtros + página + recarga). */
  chave: string
  dados: Pagina<AtribuicaoAcompanhamento> | null
  erro: string | null
}

interface ResultadoColaborador {
  chave: string
  dados: ColaboradorAcompanhamento | null
  erro: string | null
}

function mensagemDe(causa: unknown, padrao: string): string {
  return causa instanceof AtribuicaoServiceError ? causa.message : padrao
}

/**
 * Acompanhamento das trilhas da equipe (ADMIN e GESTOR — a rota já barra o
 * colaborador com a página 403). Tabela paginada com filtros, painel do
 * colaborador ao clicar no nome e exportação em CSV com os filtros aplicados.
 *
 * A página é a única dona da comunicação com a API; filtros, tabela e painel
 * só apresentam. Os filtros são selects: valem na hora e voltam à página 1.
 */
export function AcompanhamentoPage() {
  // `?status=ATRASADA` vem do "Ver todas" do dashboard: a tela já abre filtrada.
  const [parametros] = useSearchParams()
  const [filtros, setFiltros] = useState<ValoresFiltroAcompanhamento>(() => {
    const status = parametros.get('status')
    return status && STATUS_PROGRESSO.some((item) => item === status)
      ? { ...FILTRO_VAZIO, status: status as StatusProgresso }
      : FILTRO_VAZIO
  })
  const [pagina, setPagina] = useState(0)
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)

  const [opcoesTrilhas, setOpcoesTrilhas] = useState<RecursoResumo[]>([])
  const [opcoesAreas, setOpcoesAreas] = useState<RecursoResumo[]>([])

  const [exportando, setExportando] = useState(false)
  const [erroExportacao, setErroExportacao] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const [colaborador, setColaborador] = useState<ColaboradorResumo | null>(null)
  const [recargaColaborador, setRecargaColaborador] = useState(0)
  const [resultadoColaborador, setResultadoColaborador] =
    useState<ResultadoColaborador | null>(null)

  const { trilhaId, areaId, status } = filtros
  const chaveBusca = JSON.stringify([filtros, pagina, recarga])

  // Derivados do resultado em mãos, como nas outras listagens: evita acender
  // o indicador por setState dentro do efeito.
  const carregando = resultado?.chave !== chaveBusca
  const erroBusca = resultado?.chave === chaveBusca ? resultado.erro : null
  const dados = resultado?.chave === chaveBusca ? resultado.dados : null

  useEffect(() => {
    const controlador = new AbortController()

    listarAtribuicoes(
      { trilhaId, areaId, status },
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
            erro: mensagemDe(
              causa,
              'Não foi possível carregar o acompanhamento.',
            ),
          })
        }
      })

    return () => controlador.abort()
  }, [chaveBusca, trilhaId, areaId, status, pagina])

  // Opções dos selects. Se falharem, o select correspondente só não aparece:
  // dá para acompanhar sem esse filtro.
  useEffect(() => {
    let ativo = true
    listarTrilhas({}, { page: 0, size: TAMANHO_OPCOES })
      .then((busca) => {
        if (ativo) {
          setOpcoesTrilhas(busca.content.map(({ id, nome }) => ({ id, nome })))
        }
      })
      .catch(() => undefined)
    listarAreas({}, { page: 0, size: TAMANHO_OPCOES })
      .then((busca) => {
        if (ativo) {
          setOpcoesAreas(busca.content.map(({ id, nome }) => ({ id, nome })))
        }
      })
      .catch(() => undefined)
    return () => {
      ativo = false
    }
  }, [])

  const idColaborador = colaborador?.id ?? null
  const chaveColaborador = JSON.stringify([idColaborador, recargaColaborador])
  const colaboradorAtual =
    resultadoColaborador?.chave === chaveColaborador
      ? resultadoColaborador
      : null

  useEffect(() => {
    if (idColaborador === null) {
      return
    }
    const controlador = new AbortController()
    buscarAcompanhamentoDoColaborador(idColaborador, {
      signal: controlador.signal,
    })
      .then((busca) => {
        if (!controlador.signal.aborted) {
          setResultadoColaborador({
            chave: chaveColaborador,
            dados: busca,
            erro: null,
          })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setResultadoColaborador({
            chave: chaveColaborador,
            dados: null,
            erro: mensagemDe(
              causa,
              'Não foi possível carregar as trilhas do colaborador.',
            ),
          })
        }
      })
    return () => controlador.abort()
  }, [chaveColaborador, idColaborador])

  function alterarFiltros(valores: ValoresFiltroAcompanhamento) {
    setPagina(0)
    setFiltros(valores)
  }

  function recarregar() {
    setRecarga((atual) => atual + 1)
  }

  async function exportar() {
    setExportando(true)
    setErroExportacao(null)
    setAviso(null)
    try {
      // Os filtros aplicados à tabela são os mesmos do arquivo.
      baixarArquivo(await exportarAcompanhamento(filtros))
      setAviso('Exportação concluída. O download do CSV começou.')
    } catch (causa) {
      setErroExportacao(
        mensagemDe(causa, 'Não foi possível exportar o acompanhamento.'),
      )
    } finally {
      setExportando(false)
    }
  }

  const atribuicoes = dados?.content ?? []
  const listaVazia =
    !carregando && erroBusca === null && atribuicoes.length === 0
  const temFiltro = trilhaId !== '' || areaId !== '' || status !== ''

  return (
    <div className={styles.page}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Acompanhamento</h1>
          <p className={styles.hint}>
            Andamento das trilhas de cada colaborador. Trilhas com prazo vencido
            aparecem em destaque.
          </p>
        </div>
        <button
          type="button"
          className={styles.exportar}
          onClick={() => void exportar()}
          disabled={exportando}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M7 2v7M4 6.5L7 9.5l3-3M2.5 12h9"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {exportando ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </header>

      <AvisoSucesso mensagem={aviso} onSumir={() => setAviso(null)} />

      {erroExportacao && (
        <p className={styles.erro} role="alert">
          {erroExportacao}
        </p>
      )}

      <AcompanhamentoFiltros
        valores={filtros}
        onChange={alterarFiltros}
        onLimpar={() => alterarFiltros(FILTRO_VAZIO)}
        trilhas={opcoesTrilhas}
        areas={opcoesAreas}
      />

      {carregando && (
        <p role="status" className={styles.estado}>
          Carregando acompanhamento…
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
          {temFiltro
            ? 'Nenhuma trilha encontrada com os filtros atuais.'
            : 'Nenhum colaborador iniciou ou recebeu trilhas ainda.'}
        </p>
      )}

      {!carregando && erroBusca === null && atribuicoes.length > 0 && (
        <>
          <AcompanhamentoTabela
            atribuicoes={atribuicoes}
            onAbrirColaborador={(atribuicao) =>
              setColaborador(atribuicao.colaborador)
            }
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

      {colaborador && (
        <ColaboradorPainel
          colaborador={colaborador}
          dados={colaboradorAtual?.dados ?? null}
          erro={colaboradorAtual?.erro ?? null}
          onTentarDeNovo={() => setRecargaColaborador((atual) => atual + 1)}
          onFechar={() => setColaborador(null)}
        />
      )}
    </div>
  )
}
