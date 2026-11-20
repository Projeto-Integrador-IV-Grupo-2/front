import { useEffect, useState, type FormEvent } from 'react'
import { SeloSoAdmin } from '../components/conteudos/SeloSoAdmin.tsx'
import { AvisoSucesso } from '../components/comum/AvisoSucesso.tsx'
import { Link } from 'react-router-dom'
import { AcoesDeConteudo } from '../components/conteudos/AcoesDeConteudo.tsx'
import { ConfirmacaoModal } from '../components/conteudos/ConfirmacaoModal.tsx'
import { ConteudoFormulario } from '../components/conteudos/ConteudoFormulario.tsx'
import {
  cadastrarConteudo,
  garantirVisivel,
} from '../components/conteudos/salvarConteudo.ts'
import { formatarDuracao } from '../components/conteudos/vimeo.ts'
import { usePermissao } from '../hooks/usePermissao.ts'
import { caminhoDocumento } from '../routes/paths.ts'
import { PERFIS_GESTAO_CONTEUDO } from '../routes/permissions.ts'
import { listarAreas } from '../services/areaService.ts'
import {
  atualizarConteudo,
  ConteudoServiceError,
  excluirConteudo,
  listarConteudos,
} from '../services/conteudoService.ts'
import type { ApiFieldError } from '../types/api.ts'
import type { Pagina } from '../types/area.ts'
import {
  ROTULOS_TIPO_CONTEUDO,
  TIPOS_CONTEUDO,
  type Conteudo,
  type ConteudoFiltro,
  type ConteudoRequest,
  type TipoConteudo,
} from '../types/conteudo.ts'
import type { RecursoResumo } from '../types/usuario.ts'
import styles from './Catalogo.module.css'

/** Sem paginação na tela: carrega o catálogo inteiro de uma vez. */
const TAMANHO_PAGINA = 200

/** Vídeo, texto e link, mais o documento com arquivos enviados do computador. */
const TIPOS_NO_CATALOGO: TipoConteudo[] = [...TIPOS_CONTEUDO, 'DOCUMENTO']

interface ResultadoBusca {
  chave: string
  dados: Pagina<Conteudo> | null
  erro: string | null
}

function erroDe(causa: unknown, padrao: string): ConteudoServiceError {
  return causa instanceof ConteudoServiceError
    ? causa
    : new ConteudoServiceError(padrao)
}

/**
 * Catálogo de conteúdos (issue #39): filtros por título, área e tipo;
 * cadastro, edição e exclusão para ADMIN e GESTOR. Salvar já deixa o
 * conteúdo disponível: não existe o passo de publicar.
 */
export function ConteudosPage() {
  const podeGerenciar = usePermissao(PERFIS_GESTAO_CONTEUDO)

  const [tituloDigitado, setTituloDigitado] = useState('')
  const [filtro, setFiltro] = useState<ConteudoFiltro>({})
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)

  const [areas, setAreas] = useState<RecursoResumo[]>([])

  const [aviso, setAviso] = useState<string | null>(null)
  const [erroOperacao, setErroOperacao] = useState<string | null>(null)
  const [aExcluir, setAExcluir] = useState<Conteudo | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  const [formularioAberto, setFormularioAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState<Conteudo | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])

  const chaveBusca = JSON.stringify([filtro, recarga])
  const carregando = resultado?.chave !== chaveBusca
  const dados = resultado?.chave === chaveBusca ? resultado.dados : null
  const erroBusca = resultado?.chave === chaveBusca ? resultado.erro : null

  useEffect(() => {
    const controlador = new AbortController()
    // Só o catálogo das trilhas: os documentos do Conhecimento ficam lá.
    listarConteudos(
      { ...filtro, catalogo: 'TRILHA' },
      { page: 0, size: TAMANHO_PAGINA },
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
            erro: erroDe(causa, 'Não foi possível carregar os conteúdos.')
              .message,
          })
        }
      })
    return () => controlador.abort()
  }, [chaveBusca, filtro])

  // Opções dos filtros e do formulário. Sem elas a tela continua útil: o
  // filtro só fica sem opções.
  useEffect(() => {
    let ativo = true
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

  function alterarFiltro(parcial: Partial<ConteudoFiltro>) {
    setFiltro((atual) => ({ ...atual, ...parcial }))
  }

  function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    alterarFiltro({ titulo: tituloDigitado.trim() })
  }

  function abrir(conteudo: Conteudo | null) {
    setEmEdicao(conteudo)
    setErroFormulario(null)
    setFieldErrors([])
    setFormularioAberto(true)
  }

  function fechar() {
    setFormularioAberto(false)
    setEmEdicao(null)
  }

  async function salvar(request: ConteudoRequest, arquivos: File[]) {
    setSalvando(true)
    setErroFormulario(null)
    setFieldErrors([])
    try {
      if (emEdicao) {
        await atualizarConteudo(emEdicao.id, request)
        await garantirVisivel(emEdicao)
        setAviso('Conteúdo salvo.')
      } else {
        const { falha } = await cadastrarConteudo(
          { ...request, catalogo: 'TRILHA' },
          arquivos,
        )
        setAviso(
          falha
            ? `Conteúdo salvo, mas "${falha.arquivo}" não foi enviado: ${falha.motivo} Envie de novo no detalhe do conteúdo.`
            : 'Conteúdo salvo.',
        )
      }
      fechar()
      setRecarga((atual) => atual + 1)
    } catch (causa) {
      const erro = erroDe(causa, 'Não foi possível salvar o conteúdo.')
      // Erro de campo (ex.: link do Vimeo) aparece no próprio campo; o texto
      // geral só repete quando não há campo para apontar.
      setFieldErrors(erro.fieldErrors)
      setErroFormulario(erro.fieldErrors.length > 0 ? null : erro.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!aExcluir) return
    setExcluindo(true)
    setErroOperacao(null)
    try {
      await excluirConteudo(aExcluir.id)
      setAviso(`"${aExcluir.titulo}" excluído.`)
      setRecarga((atual) => atual + 1)
    } catch (causa) {
      setErroOperacao(
        erroDe(causa, 'Não foi possível excluir o conteúdo.').message,
      )
    } finally {
      setExcluindo(false)
      setAExcluir(null)
    }
  }

  const conteudos = dados?.content ?? []

  return (
    <div className={styles.page}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Conteúdos de trilha</h1>
          <p className={styles.hint}>
            Material de estudo usado nas etapas das trilhas.
          </p>
        </div>
        {podeGerenciar && (
          <button
            type="button"
            className={styles.novo}
            onClick={() => abrir(null)}
          >
            + Novo conteúdo
          </button>
        )}
      </header>

      <AvisoSucesso mensagem={aviso} onSumir={() => setAviso(null)} />

      {erroOperacao && (
        <p className={styles.erro} role="alert">
          {erroOperacao}
        </p>
      )}

      <form className={styles.filtros} onSubmit={buscar}>
        <label htmlFor="busca-conteudo" className="visually-hidden">
          Buscar conteúdo por título
        </label>
        <input
          id="busca-conteudo"
          type="search"
          placeholder="Buscar por título..."
          value={tituloDigitado}
          onChange={(event) => setTituloDigitado(event.target.value)}
        />
        <button type="submit">Buscar</button>

        <label htmlFor="filtro-area" className="visually-hidden">
          Área
        </label>
        <select
          id="filtro-area"
          value={filtro.areaId ?? ''}
          onChange={(event) => alterarFiltro({ areaId: event.target.value })}
        >
          <option value="">Todas as áreas</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.nome}
            </option>
          ))}
        </select>

        <label htmlFor="filtro-tipo" className="visually-hidden">
          Tipo
        </label>
        <select
          id="filtro-tipo"
          value={filtro.tipo ?? ''}
          onChange={(event) =>
            alterarFiltro({ tipo: event.target.value as TipoConteudo | '' })
          }
        >
          <option value="">Todos os tipos</option>
          {TIPOS_NO_CATALOGO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {ROTULOS_TIPO_CONTEUDO[tipo]}
            </option>
          ))}
        </select>
      </form>

      {carregando && (
        <p role="status" className={styles.estado}>
          Carregando conteúdos…
        </p>
      )}

      {erroBusca && (
        <div className={styles.erro} role="alert">
          <p>{erroBusca}</p>
          <button
            type="button"
            onClick={() => setRecarga((atual) => atual + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!carregando && !erroBusca && conteudos.length === 0 && (
        <p className={styles.estado}>Nenhum conteúdo encontrado.</p>
      )}

      {!carregando && !erroBusca && conteudos.length > 0 && (
        <>
          <ul className={styles.lista}>
            {conteudos.map((conteudo) => (
              <li key={conteudo.id} className={styles.cartao}>
                {conteudo.miniaturaUrl && (
                  <img
                    className={styles.miniatura}
                    src={conteudo.miniaturaUrl}
                    alt=""
                  />
                )}
                <h2>
                  {/* O detalhe abre qualquer tipo: texto, vídeo, link ou
                      documento com os arquivos. */}
                  <Link
                    className={styles.tituloLink}
                    to={caminhoDocumento(conteudo.id)}
                  >
                    {conteudo.titulo}
                  </Link>
                </h2>
                <div className={styles.meta}>
                  <span className={styles.selo}>
                    {ROTULOS_TIPO_CONTEUDO[conteudo.tipo]}
                  </span>
                  {conteudo.apenasAdmin && <SeloSoAdmin />}
                  {formatarDuracao(conteudo.duracaoSegundos) && (
                    <span>{formatarDuracao(conteudo.duracaoSegundos)}</span>
                  )}
                  {conteudo.area && <span>{conteudo.area.nome}</span>}
                </div>
                {conteudo.descricao && (
                  <p className={styles.hint}>{conteudo.descricao}</p>
                )}
                {podeGerenciar && (
                  <div className={styles.acoesIcone}>
                    <AcoesDeConteudo
                      titulo={conteudo.titulo}
                      onEditar={() => abrir(conteudo)}
                      onExcluir={() => setAExcluir(conteudo)}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {formularioAberto && (
        <ConteudoFormulario
          conteudo={emEdicao}
          categorias={[]}
          comCategoria={false}
          areas={areas}
          salvando={salvando}
          erro={erroFormulario}
          fieldErrors={fieldErrors}
          onSalvar={(request, arquivos) => void salvar(request, arquivos)}
          onFechar={fechar}
          tipos={TIPOS_NO_CATALOGO}
        />
      )}

      {aExcluir && (
        <ConfirmacaoModal
          titulo="Excluir conteúdo"
          mensagem={`"${aExcluir.titulo}" será excluído de vez, junto com os arquivos dele. Confirmar?`}
          rotuloConfirmar="Excluir"
          confirmando={excluindo}
          onConfirmar={() => void excluir()}
          onFechar={() => setAExcluir(null)}
        />
      )}
    </div>
  )
}
