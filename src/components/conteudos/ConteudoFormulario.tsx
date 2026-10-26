import { useId, useState, type FormEvent } from 'react'
import {
  CategoriaServiceError,
  criarCategoria,
} from '../../services/categoriaService.ts'
import type { ApiFieldError } from '../../types/api.ts'
import {
  ROTULOS_TIPO_CONTEUDO,
  TIPOS_CONTEUDO,
  type Categoria,
  type CategoriaRequest,
  type Conteudo,
  type ConteudoRequest,
  type TipoConteudo,
} from '../../types/conteudo.ts'
import type { RecursoResumo } from '../../types/usuario.ts'
import { CategoriaFormulario } from './CategoriaFormulario.tsx'
import { erroDoCampo } from './erroDoCampo.ts'
import { Modal } from './Modal.tsx'
import { PreviaVimeo } from './PreviaVimeo.tsx'
import styles from './Modal.module.css'

interface ConteudoFormularioProps {
  /** `null` = cadastro; preenchido = edição. */
  conteudo: Conteudo | null
  categorias: Categoria[]
  areas: RecursoResumo[]
  salvando: boolean
  erro: string | null
  fieldErrors: ApiFieldError[]
  onSalvar: (request: ConteudoRequest) => void
  onFechar: () => void
  /**
   * Categoria cadastrada aqui dentro, pelo modal. Quem abriu o formulário
   * acrescenta à própria lista para ela aparecer em outras telas também.
   */
  onCategoriaCriada?: (categoria: Categoria) => void
  /**
   * Tipos oferecidos no select, em ordem. O primeiro é o padrão no cadastro.
   * A tela de Conhecimento passa a lista começando em `DOCUMENTO`; o catálogo
   * de estudo usa o padrão `TIPOS_CONTEUDO`, que não oferece documento.
   */
  tipos?: TipoConteudo[]
  /**
   * Como a tela chama o que está sendo cadastrado — vira "Novo documento",
   * "Editar documento", "Cadastrar documento". O catálogo de estudo fala em
   * conteúdo; a tela de Conhecimento, em documento.
   */
  substantivo?: string
}

/**
 * Cadastro e edição de conteúdo. Só valida o preenchimento: se o link do
 * Vimeo existe é a API quem diz (consulta o oEmbed ao salvar), e a mensagem
 * dela aparece embaixo do campo.
 */
export function ConteudoFormulario({
  conteudo,
  categorias,
  areas,
  salvando,
  erro,
  fieldErrors,
  onSalvar,
  onFechar,
  onCategoriaCriada,
  tipos = TIPOS_CONTEUDO,
  substantivo = 'conteúdo',
}: ConteudoFormularioProps) {
  const ids = {
    titulo: useId(),
    descricao: useId(),
    tipo: useId(),
    categoria: useId(),
    area: useId(),
    videoUrl: useId(),
    corpo: useId(),
    linkUrl: useId(),
  }
  const [titulo, setTitulo] = useState(conteudo?.titulo ?? '')
  const [descricao, setDescricao] = useState(conteudo?.descricao ?? '')
  const [tipo, setTipo] = useState<TipoConteudo>(conteudo?.tipo ?? tipos[0])
  const [categoriaId, setCategoriaId] = useState(conteudo?.categoria?.id ?? '')
  const [areaId, setAreaId] = useState(conteudo?.area?.id ?? '')
  const [videoUrl, setVideoUrl] = useState(conteudo?.videoUrl ?? '')
  const [corpo, setCorpo] = useState(conteudo?.corpo ?? '')
  const [linkUrl, setLinkUrl] = useState(conteudo?.linkUrl ?? '')
  const [errosLocais, setErrosLocais] = useState<Record<string, string>>({})
  const [opcoesDeCategoria, setOpcoesDeCategoria] = useState(categorias)
  const [criandoCategoria, setCriandoCategoria] = useState(false)
  const [salvandoCategoria, setSalvandoCategoria] = useState(false)
  const [erroCategoria, setErroCategoria] = useState<string | null>(null)
  const [fieldErrorsCategoria, setFieldErrorsCategoria] = useState<
    ApiFieldError[]
  >([])

  function validar(): Record<string, string> {
    const erros: Record<string, string> = {}
    if (!titulo.trim()) {
      erros.titulo = 'Informe o título.'
    }
    if (tipo === 'VIDEO' && !videoUrl.trim()) {
      erros.videoUrl = 'Informe o link do vídeo no Vimeo.'
    }
    if (tipo === 'TEXTO' && !corpo.trim()) {
      erros.corpo = 'Escreva o texto do conteúdo.'
    }
    if (tipo === 'LINK' && !linkUrl.trim()) {
      erros.linkUrl = 'Informe o link.'
    }
    // DOCUMENTO não tem campo próprio: o material são os arquivos, enviados
    // na tela de detalhe depois de salvar.
    return erros
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (salvando) {
      return
    }
    const erros = validar()
    setErrosLocais(erros)
    if (Object.keys(erros).length > 0) {
      return
    }
    onSalvar({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      tipo,
      categoriaId: categoriaId || null,
      areaId: areaId || null,
      videoUrl: tipo === 'VIDEO' ? videoUrl.trim() : null,
      corpo: tipo === 'TEXTO' ? corpo.trim() : null,
      linkUrl: tipo === 'LINK' ? linkUrl.trim() : null,
    })
  }

  async function salvarCategoria(request: CategoriaRequest) {
    setSalvandoCategoria(true)
    setErroCategoria(null)
    setFieldErrorsCategoria([])
    try {
      const nova = await criarCategoria(request)
      setOpcoesDeCategoria((atuais) => [...atuais, nova])
      setCategoriaId(nova.id)
      setCriandoCategoria(false)
      onCategoriaCriada?.(nova)
    } catch (causa) {
      const erroDaApi =
        causa instanceof CategoriaServiceError
          ? causa
          : new CategoriaServiceError('Não foi possível cadastrar a categoria.')
      setFieldErrorsCategoria(erroDaApi.fieldErrors)
      setErroCategoria(
        erroDaApi.fieldErrors.length > 0 ? null : erroDaApi.message,
      )
    } finally {
      setSalvandoCategoria(false)
    }
  }

  function mensagem(campo: string): string | undefined {
    return errosLocais[campo] ?? erroDoCampo(fieldErrors, campo)
  }

  function erroCampo(campo: string) {
    const texto = mensagem(campo)
    return texto ? (
      <span className={styles.erroCampo} role="alert">
        {texto}
      </span>
    ) : null
  }

  return (
    <>
      <Modal
        titulo={`${conteudo ? 'Editar' : 'Novo'} ${substantivo}`}
        subtitulo="O cadastro nasce como rascunho e só aparece para os colaboradores depois de publicado."
        largo
        onFechar={onFechar}
      >
        {() => (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.campo}>
              <label htmlFor={ids.titulo}>Título</label>
              <input
                id={ids.titulo}
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                aria-invalid={Boolean(mensagem('titulo'))}
                disabled={salvando}
              />
              {erroCampo('titulo')}
            </div>

            <div className={styles.linha}>
              <div className={styles.campo}>
                <label htmlFor={ids.tipo}>Tipo</label>
                <select
                  id={ids.tipo}
                  value={tipo}
                  onChange={(event) =>
                    setTipo(event.target.value as TipoConteudo)
                  }
                  disabled={salvando}
                >
                  {tipos.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {ROTULOS_TIPO_CONTEUDO[opcao]}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.campo}>
                <label htmlFor={ids.categoria}>Categoria</label>
                <select
                  id={ids.categoria}
                  value={categoriaId}
                  onChange={(event) => setCategoriaId(event.target.value)}
                  disabled={salvando}
                >
                  <option value="">Sem categoria</option>
                  {opcoesDeCategoria.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.acaoSecundaria}
                  onClick={() => setCriandoCategoria(true)}
                  disabled={salvando}
                >
                  + Nova categoria
                </button>
              </div>
            </div>

            <div className={styles.campo}>
              <label htmlFor={ids.area}>Área</label>
              <select
                id={ids.area}
                value={areaId}
                onChange={(event) => setAreaId(event.target.value)}
                disabled={salvando}
              >
                <option value="">Todas as áreas</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.nome}
                  </option>
                ))}
              </select>
            </div>

            {tipo === 'VIDEO' && (
              <div className={styles.campo}>
                <label htmlFor={ids.videoUrl}>Link do vídeo no Vimeo</label>
                <input
                  id={ids.videoUrl}
                  type="url"
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="https://vimeo.com/123456789"
                  aria-invalid={Boolean(mensagem('videoUrl'))}
                  disabled={salvando}
                />
                <span className={styles.ajuda}>
                  Duração e miniatura são preenchidas pelo Vimeo ao salvar.
                </span>
                {erroCampo('videoUrl')}
                <PreviaVimeo link={videoUrl} titulo={titulo} />
              </div>
            )}

            {tipo === 'TEXTO' && (
              <div className={styles.campo}>
                <label htmlFor={ids.corpo}>Texto</label>
                <textarea
                  id={ids.corpo}
                  value={corpo}
                  onChange={(event) => setCorpo(event.target.value)}
                  rows={6}
                  aria-invalid={Boolean(mensagem('corpo'))}
                  disabled={salvando}
                />
                {erroCampo('corpo')}
              </div>
            )}

            {tipo === 'DOCUMENTO' && (
              <p className={styles.ajuda}>
                Salve o documento primeiro; os arquivos (PDF, DOCX, TXT ou MD)
                são enviados na tela de detalhe dele.
              </p>
            )}

            {tipo === 'LINK' && (
              <div className={styles.campo}>
                <label htmlFor={ids.linkUrl}>Link</label>
                <input
                  id={ids.linkUrl}
                  type="url"
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="https://..."
                  aria-invalid={Boolean(mensagem('linkUrl'))}
                  disabled={salvando}
                />
                {erroCampo('linkUrl')}
              </div>
            )}

            <div className={styles.campo}>
              <label htmlFor={ids.descricao}>Descrição</label>
              <textarea
                id={ids.descricao}
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                rows={3}
                disabled={salvando}
              />
            </div>

            {erro && (
              <p className={styles.erroFormulario} role="alert">
                {erro}
              </p>
            )}

            <div className={styles.acoes}>
              <button
                type="button"
                className={styles.cancelar}
                onClick={onFechar}
                disabled={salvando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={styles.salvar}
                disabled={salvando}
              >
                {salvando
                  ? 'Salvando...'
                  : conteudo
                    ? 'Salvar alterações'
                    : `Cadastrar ${substantivo}`}
              </button>
            </div>
          </form>
        )}
      </Modal>
      {criandoCategoria && (
        <CategoriaFormulario
          categoria={null}
          salvando={salvandoCategoria}
          erro={erroCategoria}
          fieldErrors={fieldErrorsCategoria}
          onSalvar={(request) => void salvarCategoria(request)}
          onFechar={() => setCriandoCategoria(false)}
        />
      )}
    </>
  )
}
