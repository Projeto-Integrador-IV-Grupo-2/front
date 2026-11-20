import { useId, useState, type FormEvent } from 'react'
import type { ApiFieldError } from '../../types/api.ts'
import {
  ROTULOS_TIPO_CONTEUDO,
  TIPOS_CONTEUDO,
  type Categoria,
  type Conteudo,
  type ConteudoRequest,
  type TipoConteudo,
} from '../../types/conteudo.ts'
import type { RecursoResumo } from '../../types/usuario.ts'
import { EscolhaDeArquivos } from './EscolhaDeArquivos.tsx'
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
  /**
   * `arquivos` só vem no cadastro de um DOCUMENTO: são os escolhidos aqui,
   * para a tela enviar assim que o documento existir na API.
   */
  onSalvar: (request: ConteudoRequest, arquivos: File[]) => void
  onFechar: () => void
  /**
   * Tipos oferecidos no select, em ordem. O primeiro é o padrão no cadastro.
   * A tela de Conhecimento passa a lista começando em `DOCUMENTO`; o catálogo
   * de estudo usa o padrão `TIPOS_CONTEUDO`.
   */
  tipos?: TipoConteudo[]
  /**
   * Mostra o campo Categoria. O catálogo de estudo organiza os conteúdos só
   * pela área (a mesma das trilhas) e esconde a categoria; na edição, a que
   * o conteúdo já tiver é mantida.
   */
  comCategoria?: boolean
  /**
   * Mostra "Visível apenas para administradores". Só a tela de Conhecimento
   * (documentos) oferece; nas outras, o valor que o conteúdo já tem é mantido.
   */
  comRestricao?: boolean
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
  tipos = TIPOS_CONTEUDO,
  substantivo = 'conteúdo',
  comCategoria = true,
  comRestricao = false,
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
    apenasAdmin: useId(),
  }
  const [titulo, setTitulo] = useState(conteudo?.titulo ?? '')
  const [descricao, setDescricao] = useState(conteudo?.descricao ?? '')
  const [tipo, setTipo] = useState<TipoConteudo>(conteudo?.tipo ?? tipos[0])
  const [categoriaId, setCategoriaId] = useState(conteudo?.categoria?.id ?? '')
  const [areaId, setAreaId] = useState(conteudo?.area?.id ?? '')
  const [videoUrl, setVideoUrl] = useState(conteudo?.videoUrl ?? '')
  const [corpo, setCorpo] = useState(conteudo?.corpo ?? '')
  const [linkUrl, setLinkUrl] = useState(conteudo?.linkUrl ?? '')
  const [apenasAdmin, setApenasAdmin] = useState(conteudo?.apenasAdmin ?? false)
  const [arquivos, setArquivos] = useState<File[]>([])
  const [errosLocais, setErrosLocais] = useState<Record<string, string>>({})
  // A categoria já gravada continua na lista mesmo se estiver inativa.
  const opcoesDeCategoria = categorias

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
    // DOCUMENTO pode nascer sem arquivo: eles também podem ser enviados
    // depois, na tela de detalhe.
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
    onSalvar(
      {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        tipo,
        categoriaId: categoriaId || null,
        areaId: areaId || null,
        videoUrl: tipo === 'VIDEO' ? videoUrl.trim() : null,
        corpo: tipo === 'TEXTO' ? corpo.trim() : null,
        linkUrl: tipo === 'LINK' ? linkUrl.trim() : null,
        apenasAdmin,
      },
      tipo === 'DOCUMENTO' && !conteudo ? arquivos : [],
    )
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

  const campoArea = (
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
      {!comCategoria && (
        <span className={styles.ajuda}>
          As mesmas áreas cadastradas para as trilhas.
        </span>
      )}
    </div>
  )

  return (
    <>
      <Modal
        titulo={`${conteudo ? 'Editar' : 'Novo'} ${substantivo}`}
        subtitulo="Ao salvar, já fica disponível para os colaboradores."
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
              {comCategoria ? (
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
                </div>
              ) : (
                campoArea
              )}
            </div>

            {comCategoria && campoArea}

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

            {/* No cadastro, os arquivos vêm junto; na edição, a tela de
                detalhe já tem o envio logo abaixo. */}
            {tipo === 'DOCUMENTO' && !conteudo && (
              <EscolhaDeArquivos
                arquivos={arquivos}
                onAlterar={setArquivos}
                desabilitado={salvando}
              />
            )}
            {tipo === 'DOCUMENTO' && conteudo && (
              <p className={styles.ajuda}>
                Os arquivos (PDF, DOCX, TXT ou MD) são enviados na tela de
                detalhe do documento.
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

            {/* Ex.: tabela de salários. A API esconde do colaborador em todo
                lugar: lista, detalhe, arquivos e respostas da IA. */}
            {comRestricao && (
              <div className={styles.opcaoMarcar}>
                <input
                  id={ids.apenasAdmin}
                  type="checkbox"
                  checked={apenasAdmin}
                  onChange={(event) => setApenasAdmin(event.target.checked)}
                  disabled={salvando}
                  aria-describedby={`${ids.apenasAdmin}-ajuda`}
                />
                <div>
                  <label htmlFor={ids.apenasAdmin}>
                    Visível apenas para administradores
                  </label>
                  <span
                    id={`${ids.apenasAdmin}-ajuda`}
                    className={styles.ajuda}
                  >
                    Desmarcado, os colaboradores também veem. Marcado, eles não
                    encontram{' '}
                    {substantivo === 'documento' ? 'o documento' : 'o conteúdo'}{' '}
                    nem recebem respostas do assistente com base nele.
                  </span>
                </div>
              </div>
            )}

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
    </>
  )
}
