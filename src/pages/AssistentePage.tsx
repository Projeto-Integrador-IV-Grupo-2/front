import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Link } from 'react-router-dom'
import {
  AssistenteServiceError,
  apagarSessao,
  criarSessao,
  enviarMensagem,
  listarMensagens,
  listarSessoes,
  tituloDaPergunta,
} from '../services/assistenteService.ts'
import {
  criarMensagemAssistente,
  criarMensagemErro,
  criarMensagemUsuario,
  fontesUnicas,
  type FonteResposta,
  type MensagemConversa,
  type MensagemErro,
} from '../utils/assistenteMensagens.ts'
import type { SessaoAssistente } from '../types/assistente.ts'
import { TextoFormatado } from '../components/assistente/TextoFormatado.tsx'
import { useAuth } from '../hooks/useAuth.ts'
import { caminhoDocumento } from '../routes/paths.ts'
import { iniciais } from '../utils/nome.ts'
import styles from './AssistentePage.module.css'

const SUGESTOES = [
  'Quais são as principais políticas da empresa?',
  'Onde encontro os procedimentos para minhas atividades?',
  'Quais treinamentos são recomendados para minha função?',
]

/** Depois deste tempo, o indicador explica que a busca nos documentos segue. */
const SEGUNDOS_PARA_DETALHAR = 4

function linkParaFonte(fonte: FonteResposta): string {
  if (fonte.documentoId) return caminhoDocumento(fonte.documentoId)
  // O histórico guarda só os títulos: a tela Conhecimento pesquisa pelo título.
  const parametros = new URLSearchParams({ titulo: fonte.titulo })
  return `/conhecimento?${parametros.toString()}`
}

const HORA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Põe a resposta logo depois da pergunta dela: com perguntas na fila, a
 * resposta da primeira não pode cair depois da segunda.
 */
function inserirAposPergunta(
  mensagens: MensagemConversa[],
  perguntaId: string,
  nova: MensagemConversa,
): MensagemConversa[] {
  const indice = mensagens.findIndex((m) => m.id === perguntaId)
  if (indice < 0) return [...mensagens, nova]
  return [
    ...mensagens.slice(0, indice + 1),
    nova,
    ...mensagens.slice(indice + 1),
  ]
}

interface PerguntaPendente {
  pergunta: string
  perguntaId: string
}

/**
 * Tela de conversa com a IA.
 *
 * - O campo nunca trava: o que for enviado enquanto a IA responde entra numa
 *   fila e é perguntado em seguida, na ordem.
 * - As conversas anteriores ficam na lateral: dá para retomar, começar outra
 *   ou apagar.
 */
export function AssistentePage() {
  const { user } = useAuth()
  const [mensagens, setMensagens] = useState<MensagemConversa[]>([])
  const [perguntaDigitada, setPerguntaDigitada] = useState('')
  const [sessaoId, setSessaoId] = useState<string | null>(null)
  const [respondendo, setRespondendo] = useState(false)
  const [segundosRespondendo, setSegundosRespondendo] = useState(0)
  const [sessoes, setSessoes] = useState<SessaoAssistente[]>([])
  const [carregandoSessoes, setCarregandoSessoes] = useState(true)
  const [carregandoConversa, setCarregandoConversa] = useState(false)
  const [erroConversas, setErroConversas] = useState<string | null>(null)
  const [confirmandoApagar, setConfirmandoApagar] = useState<string | null>(
    null,
  )
  const [listaAberta, setListaAberta] = useState(false)
  const [copiada, setCopiada] = useState<string | null>(null)

  const filaRef = useRef<PerguntaPendente[]>([])
  const processandoRef = useRef(false)
  const sessaoRef = useRef<string | null>(null)
  const campoRef = useRef<HTMLTextAreaElement>(null)
  const fimConversaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fimConversaRef.current?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'end',
    })
  }, [mensagens, respondendo])

  useEffect(() => {
    if (!respondendo) return
    const inicio = Date.now()
    const relogio = window.setInterval(
      () => setSegundosRespondendo(Math.floor((Date.now() - inicio) / 1000)),
      1000,
    )
    return () => {
      window.clearInterval(relogio)
      setSegundosRespondendo(0)
    }
  }, [respondendo])

  useEffect(() => {
    let ativo = true
    listarSessoes()
      .then((pagina) => {
        if (!ativo) return
        setSessoes(pagina.content)
        setErroConversas(null)
      })
      .catch((causa: unknown) => {
        if (!ativo) return
        setErroConversas(
          causa instanceof AssistenteServiceError
            ? causa.message
            : 'Não foi possível carregar as conversas.',
        )
      })
      .finally(() => {
        if (ativo) setCarregandoSessoes(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  function mudarSessao(id: string | null): void {
    sessaoRef.current = id
    setSessaoId(id)
  }

  /** Pergunta, uma de cada vez, tudo o que estiver na fila. */
  async function processarFila(): Promise<void> {
    if (processandoRef.current) return
    processandoRef.current = true
    setRespondendo(true)
    try {
      while (filaRef.current.length > 0) {
        const { pergunta, perguntaId } = filaRef.current[0]
        setMensagens((atuais) =>
          atuais.map((mensagem) =>
            mensagem.id === perguntaId && mensagem.tipo === 'usuario'
              ? { ...mensagem, naFila: false }
              : mensagem,
          ),
        )
        try {
          let idSessao = sessaoRef.current
          if (!idSessao) {
            // O título da conversa é o começo da primeira pergunta.
            const sessao = await criarSessao(tituloDaPergunta(pergunta))
            idSessao = sessao.id
            mudarSessao(sessao.id)
          }
          const resultado = await enviarMensagem(idSessao, pergunta)
          setMensagens((atuais) =>
            inserirAposPergunta(
              atuais,
              perguntaId,
              criarMensagemAssistente(
                resultado.resposta.conteudo,
                fontesUnicas(resultado.resposta.fontes, resultado.fontes),
              ),
            ),
          )
          const sessaoAtualizada = resultado.sessao
          if (sessaoAtualizada?.id) {
            setSessoes((atuais) => [
              sessaoAtualizada,
              ...atuais.filter((s) => s.id !== sessaoAtualizada.id),
            ])
          }
        } catch (causa) {
          const erro = causa instanceof AssistenteServiceError ? causa : null
          setMensagens((atuais) =>
            inserirAposPergunta(
              atuais,
              perguntaId,
              criarMensagemErro(
                erro?.message ??
                  'Não foi possível obter uma resposta. Tente novamente.',
                perguntaId,
                pergunta,
                erro?.status,
              ),
            ),
          )
        } finally {
          filaRef.current = filaRef.current.slice(1)
        }
      }
    } finally {
      processandoRef.current = false
      setRespondendo(false)
    }
  }

  function enfileirar(pergunta: string, perguntaId: string): void {
    filaRef.current = [...filaRef.current, { pergunta, perguntaId }]
    void processarFila()
  }

  function enviarPergunta(perguntaRecebida = perguntaDigitada): void {
    const pergunta = perguntaRecebida.trim()
    if (!pergunta || carregandoConversa) return

    const mensagemUsuario = {
      ...criarMensagemUsuario(pergunta),
      naFila: processandoRef.current,
    }
    setMensagens((atuais) => [...atuais, mensagemUsuario])
    setPerguntaDigitada('')
    // O foco volta ao campo mesmo quando o envio foi iniciado pelo botão.
    campoRef.current?.focus()
    enfileirar(pergunta, mensagemUsuario.id)
  }

  function lidarComSubmit(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault()
    enviarPergunta()
  }

  function lidarComTecla(evento: KeyboardEvent<HTMLTextAreaElement>): void {
    if (
      evento.key === 'Enter' &&
      !evento.shiftKey &&
      !evento.nativeEvent.isComposing
    ) {
      evento.preventDefault()
      enviarPergunta()
    }
  }

  function tentarNovamente(mensagem: MensagemErro): void {
    setMensagens((atuais) => atuais.filter((m) => m.id !== mensagem.id))
    enfileirar(mensagem.pergunta, mensagem.perguntaId)
  }

  function novaConversa(): void {
    if (processandoRef.current) return
    mudarSessao(null)
    setMensagens([])
    setPerguntaDigitada('')
    setListaAberta(false)
    campoRef.current?.focus()
  }

  async function abrirConversa(sessao: SessaoAssistente): Promise<void> {
    if (processandoRef.current || sessao.id === sessaoRef.current) {
      setListaAberta(false)
      return
    }
    setListaAberta(false)
    setCarregandoConversa(true)
    mudarSessao(sessao.id)
    setMensagens([])
    try {
      const historico = await listarMensagens(sessao.id)
      setMensagens(
        historico.map((mensagem) =>
          mensagem.papel === 'USUARIO'
            ? { ...criarMensagemUsuario(mensagem.conteudo), id: mensagem.id }
            : {
                ...criarMensagemAssistente(
                  mensagem.conteudo,
                  fontesUnicas(mensagem.fontes),
                ),
                id: mensagem.id,
              },
        ),
      )
    } catch (causa) {
      setMensagens([
        criarMensagemErro(
          causa instanceof AssistenteServiceError
            ? causa.message
            : 'Não foi possível carregar a conversa.',
          '',
          '',
        ),
      ])
    } finally {
      setCarregandoConversa(false)
    }
  }

  async function apagar(sessao: SessaoAssistente): Promise<void> {
    if (confirmandoApagar !== sessao.id) {
      setConfirmandoApagar(sessao.id)
      return
    }
    setConfirmandoApagar(null)
    try {
      await apagarSessao(sessao.id)
      setSessoes((atuais) => atuais.filter((s) => s.id !== sessao.id))
      if (sessaoRef.current === sessao.id) novaConversa()
    } catch (causa) {
      setErroConversas(
        causa instanceof AssistenteServiceError
          ? causa.message
          : 'Não foi possível apagar a conversa.',
      )
    }
  }

  async function copiar(id: string, texto: string): Promise<void> {
    try {
      await navigator.clipboard?.writeText(texto)
      setCopiada(id)
      window.setTimeout(
        () => setCopiada((atual) => (atual === id ? null : atual)),
        1500,
      )
    } catch {
      // Sem permissão de área de transferência: nada a fazer.
    }
  }

  const naFila = mensagens.filter(
    (m) => m.tipo === 'usuario' && m.naFila,
  ).length

  return (
    <section className={styles.page} aria-labelledby="assistente-titulo">
      <header className={styles.header}>
        <div className={styles.iconeCabecalho} aria-hidden="true">
          <SparklesIcon />
        </div>
        <div className={styles.textoCabecalho}>
          <h1 id="assistente-titulo" className={styles.titulo}>
            Assistente de IA
          </h1>
          <p className={styles.subtitulo}>
            Tire dúvidas usando os documentos e as orientações da empresa.
          </p>
        </div>
        <button
          type="button"
          className={styles.botaoConversas}
          aria-expanded={listaAberta}
          aria-controls="lista-conversas"
          onClick={() => setListaAberta((aberta) => !aberta)}
        >
          Conversas
        </button>
      </header>

      <div className={styles.corpo}>
        <aside
          id="lista-conversas"
          className={`${styles.lateral} ${listaAberta ? styles.lateralAberta : ''}`}
          aria-label="Conversas anteriores"
        >
          <button
            type="button"
            className={styles.botaoNovaConversa}
            onClick={novaConversa}
            disabled={respondendo}
          >
            + Nova conversa
          </button>
          {carregandoSessoes && (
            <p className={styles.avisoLateral}>Carregando conversas…</p>
          )}
          {erroConversas && (
            <p role="alert" className={styles.avisoLateral}>
              {erroConversas}
            </p>
          )}
          {!carregandoSessoes && sessoes.length === 0 && !erroConversas && (
            <p className={styles.avisoLateral}>Suas conversas aparecem aqui.</p>
          )}
          <ul className={styles.listaConversas}>
            {sessoes.map((sessao) => (
              <li
                key={sessao.id}
                className={
                  sessao.id === sessaoId ? styles.conversaAtiva : undefined
                }
              >
                <button
                  type="button"
                  className={styles.conversa}
                  onClick={() => void abrirConversa(sessao)}
                  disabled={respondendo}
                  aria-current={sessao.id === sessaoId ? 'true' : undefined}
                >
                  <span className={styles.tituloConversa}>{sessao.titulo}</span>
                  <span className={styles.dataConversa}>
                    {HORA.format(new Date(sessao.atualizadoEm))}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.apagarConversa}
                  onClick={() => void apagar(sessao)}
                  onBlur={() => setConfirmandoApagar(null)}
                  disabled={respondendo}
                  aria-label={
                    confirmandoApagar === sessao.id
                      ? `Confirmar exclusão da conversa ${sessao.titulo}`
                      : `Apagar conversa ${sessao.titulo}`
                  }
                >
                  {confirmandoApagar === sessao.id ? 'Apagar?' : '×'}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className={styles.painelConversa}>
          <div
            className={styles.mensagens}
            role="log"
            aria-label="Conversa com o assistente"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {carregandoConversa ? (
              <p className={styles.avisoLateral}>Carregando conversa…</p>
            ) : mensagens.length === 0 ? (
              <div className={styles.boasVindas}>
                <div className={styles.iconeBoasVindas} aria-hidden="true">
                  <SparklesIcon />
                </div>
                <h2>Como posso ajudar?</h2>
                <p>
                  Pergunte sobre processos, políticas ou materiais internos. As
                  respostas trazem links para os documentos usados como fonte.
                </p>
                <div
                  className={styles.sugestoes}
                  aria-label="Sugestões de perguntas"
                >
                  {SUGESTOES.map((sugestao) => (
                    <button
                      key={sugestao}
                      type="button"
                      className={styles.sugestao}
                      onClick={() => {
                        setPerguntaDigitada(sugestao)
                        campoRef.current?.focus()
                      }}
                    >
                      <span aria-hidden="true">↗</span>
                      {sugestao}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              mensagens.map((mensagem) => (
                <article
                  key={mensagem.id}
                  className={`${styles.mensagem} ${
                    mensagem.tipo === 'usuario'
                      ? styles.mensagemUsuario
                      : mensagem.tipo === 'erro'
                        ? styles.mensagemErro
                        : styles.mensagemAssistente
                  }`}
                >
                  <div className={styles.identidadeMensagem}>
                    <span className={styles.avatarMensagem} aria-hidden="true">
                      {mensagem.tipo === 'usuario' ? (
                        // O círculo de 26px só comporta as iniciais.
                        iniciais(user?.nomeCompleto ?? 'Você')
                      ) : mensagem.tipo === 'erro' ? (
                        '!'
                      ) : (
                        <SparklesIcon />
                      )}
                    </span>
                    <strong>
                      {mensagem.tipo === 'usuario'
                        ? 'Você'
                        : mensagem.tipo === 'erro'
                          ? 'Não foi possível responder'
                          : 'Assistente'}
                    </strong>
                    {mensagem.tipo === 'usuario' && mensagem.naFila && (
                      <span className={styles.seloFila}>Na fila</span>
                    )}
                    {mensagem.tipo === 'assistente' && (
                      <button
                        type="button"
                        className={styles.botaoCopiar}
                        onClick={() =>
                          void copiar(mensagem.id, mensagem.conteudo)
                        }
                      >
                        {copiada === mensagem.id ? 'Copiado' : 'Copiar'}
                      </button>
                    )}
                  </div>
                  {mensagem.tipo === 'usuario' && (
                    <p className={styles.textoMensagem}>{mensagem.conteudo}</p>
                  )}
                  {mensagem.tipo === 'assistente' && (
                    <TextoFormatado texto={mensagem.conteudo} />
                  )}

                  {mensagem.tipo === 'assistente' &&
                    mensagem.fontes.length > 0 && (
                      <section
                        className={styles.fontes}
                        aria-label="Fontes da resposta"
                      >
                        <h3>Fontes</h3>
                        <ul>
                          {mensagem.fontes.map((fonte) => (
                            <li key={fonte.documentoId ?? fonte.titulo}>
                              <Link to={linkParaFonte(fonte)}>
                                <DocumentIcon />
                                <span>{fonte.titulo}</span>
                                <ExternalLinkIcon />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                  {mensagem.tipo === 'erro' && (
                    <>
                      <p role="alert" className={styles.detalheErro}>
                        {mensagem.conteudo}
                      </p>
                      {mensagem.pergunta && (
                        <button
                          type="button"
                          className={styles.botaoTentarNovamente}
                          onClick={() => tentarNovamente(mensagem)}
                        >
                          Tentar novamente
                        </button>
                      )}
                    </>
                  )}
                </article>
              ))
            )}

            {respondendo && (
              <div
                className={styles.respondendo}
                role="status"
                aria-live="polite"
              >
                <span className={styles.pontosDigitando} aria-hidden="true">
                  <span /> <span /> <span />
                </span>
                {segundosRespondendo >= SEGUNDOS_PARA_DETALHAR
                  ? 'O assistente está respondendo… consultando os documentos da empresa.'
                  : 'O assistente está respondendo…'}
              </div>
            )}
            <div ref={fimConversaRef} aria-hidden="true" />
          </div>

          <form className={styles.compositor} onSubmit={lidarComSubmit}>
            <label className="visually-hidden" htmlFor="pergunta-assistente">
              Escreva sua pergunta
            </label>
            <textarea
              ref={campoRef}
              id="pergunta-assistente"
              className={styles.campoPergunta}
              value={perguntaDigitada}
              onChange={(evento) => setPerguntaDigitada(evento.target.value)}
              onKeyDown={lidarComTecla}
              placeholder={
                respondendo
                  ? 'Pode continuar digitando: a próxima pergunta entra na fila…'
                  : 'Escreva sua pergunta…'
              }
              rows={2}
              maxLength={2000}
            />
            <div className={styles.rodapeCompositor}>
              <span>
                {naFila > 0
                  ? `${naFila} pergunta${naFila > 1 ? 's' : ''} na fila`
                  : 'Enter para enviar · Shift+Enter para nova linha'}
              </span>
              <button
                type="submit"
                className={styles.botaoEnviar}
                disabled={
                  carregandoConversa || perguntaDigitada.trim().length === 0
                }
              >
                <span>Enviar</span>
                <SendIcon />
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

function SparklesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="17"
      height="17"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5.5 2.5h6l3 3v12h-9v-15Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 2.8v3h3M7.5 9h5M7.5 12h5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="15"
      height="15"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11 3h6v6M17 3l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 11v5H4V5h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="17"
      height="17"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m3 3 14 7-14 7 2-7-2-7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M5 10h11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
