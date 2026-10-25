import { useEffect, useState } from 'react'
import { Paginacao } from '../components/areas/Paginacao.tsx'
import { ConhecimentoFiltros } from '../components/conhecimento/ConhecimentoFiltros.tsx'
import { DocumentosLista } from '../components/conhecimento/DocumentosLista.tsx'
import {
  criarFiltroInicial,
  paraFiltroDaApi,
  temFiltroAlterado,
  type FiltroConhecimento,
} from '../components/conhecimento/filtroConhecimento.ts'
import { usePermissao } from '../hooks/usePermissao.ts'
import { useValorAdiado } from '../hooks/useValorAdiado.ts'
import { PERFIS_GESTAO_CONTEUDO } from '../routes/permissions.ts'
import { listarAreas } from '../services/areaService.ts'
import { listarCategorias } from '../services/categoriaService.ts'
import {
  ConteudoServiceError,
  listarConteudos,
} from '../services/conteudoService.ts'
import type { Pagina } from '../types/area.ts'
import type { Categoria, Conteudo } from '../types/conteudo.ts'
import type { RecursoResumo } from '../types/usuario.ts'
import styles from './ConhecimentoPage.module.css'

const TAMANHO_PAGINA = 10

interface ResultadoBusca {
  /** Identifica a busca que produziu este resultado (filtros + página + recarga). */
  chave: string
  dados: Pagina<Conteudo> | null
  erro: string | null
}

/**
 * Tela de Conhecimento (issue #48): os documentos da empresa, com busca por
 * título e filtros de categoria, área e tipo — ADMIN e GESTOR também filtram
 * por status. Abre nos documentos (ver `criarFiltroInicial`).
 *
 * A busca por título só sai quando a pessoa para de digitar. Qualquer
 * mudança de filtro volta para a página 1. Colaborador vê só documentos
 * publicados: a API filtra, e a tela nem envia status.
 */
export function ConhecimentoPage() {
  const podeFiltrarStatus = usePermissao(PERFIS_GESTAO_CONTEUDO)

  const [tituloDigitado, setTituloDigitado] = useState('')
  const tituloBuscado = useValorAdiado(tituloDigitado.trim())
  const [selecoes, setSelecoes] =
    useState<FiltroConhecimento>(criarFiltroInicial)
  const filtro: FiltroConhecimento = { ...selecoes, titulo: tituloBuscado }

  // A página fica presa aos filtros em que foi escolhida: mudou o filtro, a
  // página volta a ser a primeira sem precisar de um efeito para isso.
  const chaveFiltro = JSON.stringify(paraFiltroDaApi(filtro, podeFiltrarStatus))
  const [paginaEscolhida, setPaginaEscolhida] = useState({
    chave: '',
    pagina: 0,
  })
  const pagina =
    paginaEscolhida.chave === chaveFiltro ? paginaEscolhida.pagina : 0

  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [areas, setAreas] = useState<RecursoResumo[]>([])

  const chaveBusca = JSON.stringify([chaveFiltro, pagina, recarga])
  const carregando = resultado?.chave !== chaveBusca
  const dados = resultado?.chave === chaveBusca ? resultado.dados : null
  const erroBusca = resultado?.chave === chaveBusca ? resultado.erro : null

  // O filtro vai para o efeito pela chave em texto: um objeto novo a cada
  // render dispararia a busca de novo sem nada ter mudado.
  useEffect(() => {
    const controlador = new AbortController()
    listarConteudos(
      JSON.parse(chaveFiltro) as ReturnType<typeof paraFiltroDaApi>,
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
            erro:
              causa instanceof ConteudoServiceError
                ? causa.message
                : 'Não foi possível carregar os documentos.',
          })
        }
      })
    return () => controlador.abort()
  }, [chaveBusca, chaveFiltro, pagina])

  // Opções dos filtros. Sem elas a tela continua útil: o filtro só fica sem
  // opções.
  useEffect(() => {
    let ativo = true
    listarCategorias({ size: 100 })
      .then((busca) => ativo && setCategorias(busca.content))
      .catch(() => undefined)
    listarAreas({}, { size: 100 })
      .then(
        (busca) =>
          ativo &&
          setAreas(busca.content.map(({ id, nome }) => ({ id, nome }))),
      )
      .catch(() => undefined)
    return () => {
      ativo = false
    }
  }, [])

  function limpar() {
    setTituloDigitado('')
    setSelecoes(criarFiltroInicial())
  }

  const documentos = dados?.content ?? []
  const filtrando = temFiltroAlterado(filtro)
  const vazia = !carregando && erroBusca === null && documentos.length === 0

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.titulo}>Conhecimento</h1>
        <p className={styles.hint}>
          Encontre as políticas, os manuais e os demais documentos da empresa.
        </p>
      </header>

      <ConhecimentoFiltros
        tituloDigitado={tituloDigitado}
        filtro={selecoes}
        categorias={categorias}
        areas={areas}
        podeFiltrarStatus={podeFiltrarStatus}
        mostrarLimpar={filtrando || tituloDigitado.trim() !== ''}
        onTitulo={setTituloDigitado}
        onAlterar={(parcial) =>
          setSelecoes((atual) => ({ ...atual, ...parcial }))
        }
        onLimpar={limpar}
      />

      {carregando && (
        <p role="status" className={styles.carregando}>
          Carregando documentos…
        </p>
      )}

      {erroBusca && (
        <div className={styles.erro} role="alert">
          <p>{erroBusca}</p>
          <button type="button" onClick={() => setRecarga((n) => n + 1)}>
            Tentar novamente
          </button>
        </div>
      )}

      {vazia && (
        <div className={styles.vazio}>
          <p className={styles.vazioTitulo}>
            {filtrando
              ? 'Nenhum documento encontrado com esses filtros'
              : 'Nenhum documento disponível ainda'}
          </p>
          <p className={styles.vazioTexto}>
            {filtrando
              ? 'Tente outro título ou limpe os filtros para ver todos os documentos.'
              : 'Quando um documento for publicado, ele aparece aqui.'}
          </p>
        </div>
      )}

      {!carregando && erroBusca === null && dados && documentos.length > 0 && (
        <>
          <DocumentosLista
            documentos={documentos}
            mostrarStatus={podeFiltrarStatus}
          />
          <Paginacao
            pagina={dados.page.number}
            totalPaginas={dados.page.totalPages}
            totalElementos={dados.page.totalElements}
            onIrPara={(novaPagina) =>
              setPaginaEscolhida({ chave: chaveFiltro, pagina: novaPagina })
            }
            desabilitado={carregando}
            item="documento"
            itens="documentos"
          />
        </>
      )}
    </div>
  )
}
