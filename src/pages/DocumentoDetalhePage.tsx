import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
  despublicarConteudo,
  publicarConteudo,
} from '../services/conteudoService.ts'
import type { ApiFieldError } from '../types/api.ts'
import type { Arquivo } from '../types/arquivo.ts'
import { TIPOS_NO_FORMULARIO } from '../components/conhecimento/tiposDoDocumento.ts'
import {
  ROTULOS_STATUS_CONTEUDO,
  ROTULOS_TIPO_CONTEUDO,
  TIPOS_CONTEUDO,
  type Categoria,
  type Conteudo,
  type ConteudoRequest,
} from '../types/conteudo.ts'
import type { RecursoResumo } from '../types/usuario.ts'
import styles from './DocumentoDetalhePage.module.css'

type Confirmacao = 'publicar' | 'despublicar' | null

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
 * ações de gestão — editar, enviar arquivo, publicar e despublicar — ficam
 * atrás de `usePermissao`, igual ao resto do Conhecimento.
 */
export function DocumentoDetalhePage() {
  const { id = '' } = useParams<{ id: string }>()
  const podeGerenciar = usePermissao(PERFIS_GESTAO_CONTEUDO)

  const [recarga, setRecarga] = useState(0)
  const [carga, setCarga] = useState<Carga | null>(null)
  const [arquivos, setArquivos] = useState<Arquivo[]>([])

  const [selecionado, setSelecionado] = useState<Arquivo | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erroOperacao, setErroOperacao] = useState<string | null>(null)

  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null)
  const [confirmando, setConfirmando] = useState(false)

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
      definirConteudo(await atualizarConteudo(id, request))
      setEditando(false)
      setAviso('Documento atualizado.')
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

  async function confirmar() {
    if (!confirmacao || !conteudo) {
      return
    }
    const publicando = confirmacao === 'publicar'
    setConfirmando(true)
    setErroOperacao(null)
    try {
      definirConteudo(
        publicando ? await publicarConteudo(id) : await despublicarConteudo(id),
      )
      setAviso(publicando ? 'Documento publicado.' : 'Documento despublicado.')
    } catch (causa) {
      setErroOperacao(
        mensagemDe(
          causa,
          publicando
            ? 'Não foi possível publicar o documento.'
            : 'Não foi possível despublicar o documento.',
        ),
      )
    } finally {
      setConfirmando(false)
      setConfirmacao(null)
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

  const publicado = conteudo.status === 'PUBLICADO'
  // A mesma tela abre qualquer conteúdo: o documento volta para o
  // Conhecimento; vídeo, texto e link, para o catálogo de Conteúdos.
  const ehDocumento = conteudo.tipo === 'DOCUMENTO'
  // O catálogo de Conteúdos é tela de gestão: o colaborador volta ao
  // Conhecimento, que é a tela dele.
  const voltaParaConteudos = !ehDocumento && podeGerenciar

  return (
    <div className={styles.page}>
      <Link
        to={voltaParaConteudos ? ROTAS.conteudos : ROTAS.conhecimento}
        className={styles.voltar}
      >
        ← Voltar para {voltaParaConteudos ? 'Conteúdos' : 'Conhecimento'}
      </Link>

      <header className={styles.cabecalho}>
        <div>
          <h1>{conteudo.titulo}</h1>
          <div className={styles.meta}>
            <span className={styles.selo}>
              {ROTULOS_TIPO_CONTEUDO[conteudo.tipo]}
            </span>
            {podeGerenciar && (
              <span
                className={`${styles.selo} ${
                  publicado ? styles.seloPublicado : styles.seloRascunho
                }`}
              >
                {ROTULOS_STATUS_CONTEUDO[conteudo.status]}
              </span>
            )}
            {conteudo.categoria && <span>{conteudo.categoria.nome}</span>}
            {conteudo.area && <span>{conteudo.area.nome}</span>}
            {formatarDuracao(conteudo.duracaoSegundos) && (
              <span>{formatarDuracao(conteudo.duracaoSegundos)}</span>
            )}
          </div>
        </div>
        {podeGerenciar && (
          <div className={styles.acoes}>
            <button type="button" onClick={() => setEditando(true)}>
              Editar
            </button>
            <button
              type="button"
              className={styles.primaria}
              onClick={() =>
                setConfirmacao(publicado ? 'despublicar' : 'publicar')
              }
            >
              {publicado ? 'Despublicar' : 'Publicar'}
            </button>
          </div>
        )}
      </header>

      <div role="status" aria-live="polite" className={styles.avisoRegiao}>
        {aviso && <p className={styles.aviso}>{aviso}</p>}
      </div>

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
      {(ehDocumento || arquivos.length > 0) && (
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
          onCategoriaCriada={(categoria) =>
            setCategorias((atuais) => [...atuais, categoria])
          }
          tipos={ehDocumento ? TIPOS_NO_FORMULARIO : TIPOS_CONTEUDO}
          comCategoria={ehDocumento}
          substantivo={ehDocumento ? 'documento' : 'conteúdo'}
        />
      )}

      {confirmacao && (
        <ConfirmacaoModal
          titulo={
            confirmacao === 'publicar'
              ? 'Publicar documento'
              : 'Despublicar documento'
          }
          mensagem={
            confirmacao === 'publicar'
              ? `"${conteudo.titulo}" passa a aparecer para todos os colaboradores. Confirmar?`
              : `"${conteudo.titulo}" volta a ser rascunho e some para os colaboradores. Confirmar?`
          }
          rotuloConfirmar={
            confirmacao === 'publicar' ? 'Publicar' : 'Despublicar'
          }
          confirmando={confirmando}
          onConfirmar={() => void confirmar()}
          onFechar={() => setConfirmacao(null)}
        />
      )}
    </div>
  )
}
