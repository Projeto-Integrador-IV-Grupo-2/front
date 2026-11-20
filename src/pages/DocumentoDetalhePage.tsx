import { useEffect, useState } from 'react'
import { SeloSoAdmin } from '../components/conteudos/SeloSoAdmin.tsx'
import { AvisoSucesso } from '../components/comum/AvisoSucesso.tsx'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AcoesDeConteudo } from '../components/conteudos/AcoesDeConteudo.tsx'
import { ConfirmacaoModal } from '../components/conteudos/ConfirmacaoModal.tsx'
import { ConteudoFormulario } from '../components/conteudos/ConteudoFormulario.tsx'
import { EnvioDeArquivos } from '../components/conteudos/EnvioDeArquivos.tsx'
import { ListaDeArquivos } from '../components/conteudos/ListaDeArquivos.tsx'
import { PreviaDeArquivo } from '../components/conteudos/previa/PreviaDeArquivo.tsx'
import { PreviaVimeo } from '../components/conteudos/PreviaVimeo.tsx'
import { formatarDuracao } from '../components/conteudos/vimeo.ts'
import { usePermissao } from '../hooks/usePermissao.ts'
import { ROTAS } from '../routes/paths.ts'
import { PERFIS_GESTAO_CONTEUDO } from '../routes/permissions.ts'
import { listarAreas } from '../services/areaService.ts'
import {
  ArquivoServiceError,
  listarArquivos,
} from '../services/arquivoService.ts'
import { listarCategorias } from '../services/categoriaService.ts'
import {
  atualizarConteudo,
  buscarConteudo,
  ConteudoServiceError,
  excluirConteudo,
} from '../services/conteudoService.ts'
import type { ApiFieldError } from '../types/api.ts'
import type { Arquivo } from '../types/arquivo.ts'
import { TIPOS_NO_FORMULARIO } from '../components/conhecimento/tiposDoDocumento.ts'
import {
  ROTULOS_TIPO_CONTEUDO,
  TIPOS_CONTEUDO,
  type Categoria,
  type Conteudo,
  type ConteudoRequest,
} from '../types/conteudo.ts'
import type { RecursoResumo } from '../types/usuario.ts'
import { garantirVisivel } from '../components/conteudos/salvarConteudo.ts'
import styles from './DocumentoDetalhePage.module.css'

/** Resultado da carga, carimbado com a busca a que pertence. */
interface Carga {
  chave: string
  conteudo: Conteudo | null
  erro: string | null
}

function mensagemDe(causa: unknown, padrao: string): string {
  if (
    causa instanceof ConteudoServiceError ||
    causa instanceof ArquivoServiceError
  ) {
    return causa.message
  }
  return padrao
}

/**
 * Detalhe de um documento da tela de Conhecimento (issue #49): dados,
 * arquivos, download e pré-visualização. É para cá que cada linha da
 * listagem da issue #48 aponta.
 *
 * Qualquer usuário autenticado abre a tela; a API decide o que ele pode ver
 * (colaborador só alcança documento publicado, e rascunho responde 404). As
 * ações de gestão — editar, enviar arquivo e excluir — ficam
 * atrás de `usePermissao`, igual ao resto do Conhecimento.
 */
export function DocumentoDetalhePage() {
  const { id = '' } = useParams<{ id: string }>()
  const podeGerenciar = usePermissao(PERFIS_GESTAO_CONTEUDO)
  const navigate = useNavigate()

  const [recarga, setRecarga] = useState(0)
  const [carga, setCarga] = useState<Carga | null>(null)
  const [arquivos, setArquivos] = useState<Arquivo[]>([])

  const [selecionado, setSelecionado] = useState<Arquivo | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erroOperacao, setErroOperacao] = useState<string | null>(null)

  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [areas, setAreas] = useState<RecursoResumo[]>([])

  // A carga é carimbada com a busca a que pertence, em vez de um sinalizador
  // ligado no começo do efeito: trocar de documento já renderiza "carregando"
  // sem um `setState` síncrono dentro do efeito.
  const chave = `${id}:${recarga}`
  const carregando = carga?.chave !== chave
  const conteudo = carga?.chave === chave ? carga.conteudo : null
  const erroBusca = carga?.chave === chave ? carga.erro : null

  useEffect(() => {
    const controlador = new AbortController()
    buscarConteudo(id, { signal: controlador.signal })
      .then(async (encontrado) => {
        if (controlador.signal.aborted) {
          return
        }
        // Os arquivos seguem a visibilidade do conteúdo: se o documento abriu,
        // a lista dele também abre. Uma falha aqui não derruba a tela inteira.
        try {
          setArquivos(await listarArquivos(id))
        } catch {
          setArquivos([])
        }
        if (!controlador.signal.aborted) {
          setCarga({ chave, conteudo: encontrado, erro: null })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setCarga({
            chave,
            conteudo: null,
            erro: mensagemDe(causa, 'Não foi possível carregar o documento.'),
          })
        }
      })
    return () => controlador.abort()
  }, [id, chave])

  // Opções do formulário de edição. Sem elas a tela continua útil.
  useEffect(() => {
    let ativo = true
    listarCategorias({ size: 100 })
      .then((busca) => ativo && setCategorias(busca.content))
      .catch(() => undefined)
    listarAreas({}, { size: 100 })
      .then(
        (busca) =>
          ativo &&
          setAreas(
            busca.content.map(({ id: areaId, nome }) => ({ id: areaId, nome })),
          ),
      )
      .catch(() => undefined)
    return () => {
      ativo = false
    }
  }, [])

  /** Substitui o documento em tela depois de uma operação bem-sucedida. */
  function definirConteudo(novo: Conteudo) {
    setCarga({ chave, conteudo: novo, erro: null })
  }

  async function salvar(request: ConteudoRequest) {
    setSalvando(true)
    setErroFormulario(null)
    setFieldErrors([])
    try {
      const salvo = await atualizarConteudo(id, request)
      await garantirVisivel(salvo)
      definirConteudo({ ...salvo, status: 'PUBLICADO' })
      setEditando(false)
      setAviso('Salvo.')
    } catch (causa) {
      const erro =
        causa instanceof ConteudoServiceError
          ? causa
          : new ConteudoServiceError('Não foi possível salvar o documento.')
      setFieldErrors(erro.fieldErrors)
      setErroFormulario(erro.fieldErrors.length > 0 ? null : erro.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!conteudo) {
      return
    }
    setExcluindo(true)
    setErroOperacao(null)
    try {
      await excluirConteudo(id)
      // Volta para a lista de onde o conteúdo veio.
      navigate(
        conteudo.catalogo === 'TRILHA' && podeGerenciar
          ? ROTAS.conteudos
          : ROTAS.conhecimento,
        { replace: true },
      )
    } catch (causa) {
      setErroOperacao(mensagemDe(causa, 'Não foi possível excluir.'))
      setExcluindo(false)
      setConfirmandoExclusao(false)
    }
  }

  function aoEnviarArquivo(novo: Arquivo) {
    setArquivos((atuais) => [...atuais, novo])
    setSelecionado(novo)
    setAviso(`"${novo.nomeOriginal}" enviado.`)
  }

  if (carregando) {
    return (
      <p role="status" className={styles.estado}>
        Carregando documento…
      </p>
    )
  }

  if (erroBusca || !conteudo) {
    return (
      <div className={styles.page}>
        <Link to={ROTAS.conhecimento} className={styles.voltar}>
          ← Voltar para Conhecimento
        </Link>
        <div className={styles.erro} role="alert">
          <p>{erroBusca ?? 'Documento não encontrado.'}</p>
          <button
            type="button"
            onClick={() => setRecarga((atual) => atual + 1)}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // A mesma tela abre os dois catálogos: o do Conhecimento volta para lá; o
  // das trilhas, para "Conteúdos de trilha".
  const ehDocumento = conteudo.catalogo === 'CONHECIMENTO'
  // "Conteúdos de trilha" é tela de gestão: o colaborador volta ao
  // Conhecimento, que é a tela dele.
  const voltaParaConteudos = !ehDocumento && podeGerenciar

  return (
    <div className={styles.page}>
      <Link
        to={voltaParaConteudos ? ROTAS.conteudos : ROTAS.conhecimento}
        className={styles.voltar}
      >
        ← Voltar para{' '}
        {voltaParaConteudos ? 'Conteúdos de trilha' : 'Conhecimento'}
      </Link>

      <header className={styles.cabecalho}>
        <div>
          <h1>{conteudo.titulo}</h1>
          <div className={styles.meta}>
            <span className={styles.selo}>
              {ROTULOS_TIPO_CONTEUDO[conteudo.tipo]}
            </span>
            {conteudo.apenasAdmin && <SeloSoAdmin />}
            {conteudo.categoria && <span>{conteudo.categoria.nome}</span>}
            {conteudo.area && <span>{conteudo.area.nome}</span>}
            {formatarDuracao(conteudo.duracaoSegundos) && (
              <span>{formatarDuracao(conteudo.duracaoSegundos)}</span>
            )}
          </div>
        </div>
        {podeGerenciar && (
          <AcoesDeConteudo
            titulo={conteudo.titulo}
            onEditar={() => setEditando(true)}
            onExcluir={() => setConfirmandoExclusao(true)}
          />
        )}
      </header>

      <AvisoSucesso mensagem={aviso} onSumir={() => setAviso(null)} />

      {erroOperacao && (
        <p className={styles.erro} role="alert">
          {erroOperacao}
        </p>
      )}

      {conteudo.descricao && <p>{conteudo.descricao}</p>}

      {conteudo.tipo === 'TEXTO' && conteudo.corpo && (
        <section className={styles.secao}>
          <h2>Texto</h2>
          <p className={styles.corpo}>{conteudo.corpo}</p>
        </section>
      )}

      {conteudo.tipo === 'VIDEO' && conteudo.videoUrl && (
        <section className={styles.secao}>
          <h2>Vídeo</h2>
          <PreviaVimeo link={conteudo.videoUrl} titulo={conteudo.titulo} />
          <a href={conteudo.videoUrl} target="_blank" rel="noreferrer noopener">
            Abrir no Vimeo
          </a>
        </section>
      )}

      {conteudo.tipo === 'LINK' && conteudo.linkUrl && (
        <section className={styles.secao}>
          <h2>Link</h2>
          <a href={conteudo.linkUrl} target="_blank" rel="noreferrer noopener">
            {conteudo.linkUrl}
          </a>
        </section>
      )}

      {/* Arquivo é o material do documento; os outros tipos não têm. */}
      {(conteudo.tipo === 'DOCUMENTO' || arquivos.length > 0) && (
        <section className={styles.secao}>
          <h2>Arquivos</h2>
          {podeGerenciar && (
            <EnvioDeArquivos conteudoId={id} onEnviado={aoEnviarArquivo} />
          )}
          <ListaDeArquivos
            arquivos={arquivos}
            selecionadoId={selecionado?.id ?? null}
            onSelecionar={setSelecionado}
          />
        </section>
      )}

      {selecionado && (
        <section className={styles.secao}>
          <h2>Pré-visualização: {selecionado.nomeOriginal}</h2>
          <PreviaDeArquivo arquivo={selecionado} />
        </section>
      )}

      {editando && (
        <ConteudoFormulario
          conteudo={conteudo}
          categorias={categorias}
          areas={areas}
          salvando={salvando}
          erro={erroFormulario}
          fieldErrors={fieldErrors}
          onSalvar={(request) => void salvar(request)}
          onFechar={() => setEditando(false)}
          comRestricao={ehDocumento}
          tipos={
            ehDocumento ? TIPOS_NO_FORMULARIO : [...TIPOS_CONTEUDO, 'DOCUMENTO']
          }
          comCategoria={ehDocumento}
          substantivo={conteudo.tipo === 'DOCUMENTO' ? 'documento' : 'conteúdo'}
        />
      )}

      {confirmandoExclusao && (
        <ConfirmacaoModal
          titulo={
            conteudo.tipo === 'DOCUMENTO'
              ? 'Excluir documento'
              : 'Excluir conteúdo'
          }
          mensagem={`"${conteudo.titulo}" será excluído de vez, junto com os arquivos dele. Confirmar?`}
          rotuloConfirmar="Excluir"
          confirmando={excluindo}
          onConfirmar={() => void excluir()}
          onFechar={() => setConfirmandoExclusao(false)}
        />
      )}
    </div>
  )
}
