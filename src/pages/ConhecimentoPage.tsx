import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Paginacao } from '../components/areas/Paginacao.tsx'
import { ConhecimentoFiltros } from '../components/conhecimento/ConhecimentoFiltros.tsx'
import { DocumentosLista } from '../components/conhecimento/DocumentosLista.tsx'
import { TIPOS_NO_FORMULARIO } from '../components/conhecimento/tiposDoDocumento.ts'
import { ConteudoFormulario } from '../components/conteudos/ConteudoFormulario.tsx'
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
import {
  ArquivoServiceError,
  enviarArquivo,
} from '../services/arquivoService.ts'
import { listarCategorias } from '../services/categoriaService.ts'
import { aoMudarConteudos } from '../services/conteudoEvents.ts'
import {
  ConteudoServiceError,
  criarConteudo,
  listarConteudos,
} from '../services/conteudoService.ts'
import type { ApiFieldError } from '../types/api.ts'
import type { Pagina } from '../types/area.ts'
import type { Categoria, Conteudo, ConteudoRequest } from '../types/conteudo.ts'
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
  // Mesma lista de perfis para as duas coisas: quem enxerga rascunho é quem
  // administra o acervo.
  const podeGerenciar = usePermissao(PERFIS_GESTAO_CONTEUDO)
  const podeFiltrarStatus = podeGerenciar

  // `?titulo=` abre a tela já buscando um documento — é como as fontes do
  // assistente de IA trazem a pessoa até aqui.
  const [searchParams] = useSearchParams()
  const [tituloDigitado, setTituloDigitado] = useState(
    () => searchParams.get('titulo') ?? '',
  )
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

  const [formularioAberto, setFormularioAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])

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

  // Observer: a listagem se inscreve nas mudanças de documento, então ela
  // recarrega mesmo quando quem salvou ou publicou foi a tela de detalhe.
  useEffect(() => aoMudarConteudos(() => setRecarga((n) => n + 1)), [])

  async function salvar(request: ConteudoRequest, arquivos: File[]) {
    setSalvando(true)
    setErroFormulario(null)
    setFieldErrors([])
    let documento: Conteudo
    try {
      documento = await criarConteudo(request)
    } catch (causa) {
      const erro =
        causa instanceof ConteudoServiceError
          ? causa
          : new ConteudoServiceError('Não foi possível cadastrar o documento.')
      // Erro de campo aparece no próprio campo; o texto geral só repete
      // quando não há campo para apontar.
      setFieldErrors(erro.fieldErrors)
      setErroFormulario(erro.fieldErrors.length > 0 ? null : erro.message)
      setSalvando(false)
      return
    }

    // O documento já existe: daqui em diante uma falha não pode reabrir o
    // cadastro (salvar de novo duplicaria). Envia um arquivo por vez e, se
    // algum falhar, avisa qual foi: o envio pode ser refeito no detalhe.
    for (const arquivo of arquivos) {
      try {
        await enviarArquivo(documento.id, arquivo)
      } catch (causa) {
        const motivo =
          causa instanceof ArquivoServiceError
            ? causa.message
            : 'Não foi possível enviar o arquivo.'
        setSalvando(false)
        setFormularioAberto(false)
        setAviso(
          `Documento cadastrado, mas "${arquivo.name}" não foi enviado: ${motivo} Envie de novo no detalhe do documento.`,
        )
        return
      }
    }

    setSalvando(false)
    setFormularioAberto(false)
    setAviso(
      arquivos.length > 0
        ? `Documento cadastrado como rascunho com ${arquivos.length} ${arquivos.length === 1 ? 'arquivo' : 'arquivos'}.`
        : request.tipo === 'DOCUMENTO'
          ? 'Documento cadastrado como rascunho. Envie os arquivos dele no detalhe.'
          : 'Documento cadastrado como rascunho.',
    )
  }

  function limpar() {
    setTituloDigitado('')
    setSelecoes(criarFiltroInicial())
  }

  const documentos = dados?.content ?? []
  const filtrando = temFiltroAlterado(filtro)
  const vazia = !carregando && erroBusca === null && documentos.length === 0

  return (
    <div className={styles.page}>
      <header className={styles.cabecalho}>
        <div>
          <h1 className={styles.titulo}>Conhecimento</h1>
          <p className={styles.hint}>
            Encontre as políticas, os manuais e os demais documentos da empresa.
          </p>
        </div>
        {podeGerenciar && (
          <button
            type="button"
            className={styles.novo}
            onClick={() => {
              setErroFormulario(null)
              setFieldErrors([])
              setFormularioAberto(true)
            }}
          >
            + Novo documento
          </button>
        )}
      </header>

      <div role="status" aria-live="polite" className={styles.avisoRegiao}>
        {aviso && <p className={styles.aviso}>{aviso}</p>}
      </div>

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

      {formularioAberto && (
        <ConteudoFormulario
          conteudo={null}
          categorias={categorias}
          areas={areas}
          salvando={salvando}
          erro={erroFormulario}
          fieldErrors={fieldErrors}
          onSalvar={(request, arquivos) => void salvar(request, arquivos)}
          onFechar={() => setFormularioAberto(false)}
          onCategoriaCriada={(categoria) =>
            setCategorias((atuais) => [...atuais, categoria])
          }
          tipos={TIPOS_NO_FORMULARIO}
          substantivo="documento"
        />
      )}
    </div>
  )
}
