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
  criarSessao,
  enviarMensagem,
  tituloDaPergunta,
} from '../services/assistenteService.ts'
import {
  criarMensagemAssistente,
  criarMensagemErro,
  criarMensagemUsuario,
  type MensagemConversa,
  type MensagemErro,
} from '../utils/assistenteMensagens.ts'
import styles from './AssistentePage.module.css'

const SUGESTOES = [
  'Quais são as principais políticas da empresa?',
  'Onde encontro os procedimentos para minhas atividades?',
  'Quais treinamentos são recomendados para minha função?',
]

function linkParaFonte(titulo: string): string {
  // O DTO atual do backend retorna apenas os títulos das fontes, sem IDs.
  // A tela Conhecimento pesquisa pelo título e mostra o documento correspondente.
  const parametros = new URLSearchParams({ titulo })
  return `/conhecimento?${parametros.toString()}`
}

/**
 * Tela de conversa com a IA. O estado e a sessão ficam concentrados nesta página.
 */
export function AssistentePage() {
  const [mensagens, setMensagens] = useState<MensagemConversa[]>([])
  const [perguntaDigitada, setPerguntaDigitada] = useState('')
  const [sessaoId, setSessaoId] = useState<string | null>(null)
  const [respondendo, setRespondendo] = useState(false)
  const travaEnvioRef = useRef(false)
  const campoRef = useRef<HTMLTextAreaElement>(null)
  const fimConversaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fimConversaRef.current?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'end',
    })
  }, [mensagens, respondendo])

  useEffect(() => {
    if (!respondendo && mensagens.length > 0) {
      campoRef.current?.focus()
    }
  }, [respondendo, mensagens.length])

  async function processarPergunta(
    pergunta: string,
    perguntaId: string,
    erroId?: string,
  ): Promise<void> {
    if (travaEnvioRef.current) return

    travaEnvioRef.current = true
    setRespondendo(true)
    if (erroId) {
      setMensagens((atuais) =>
        atuais.filter((mensagem) => mensagem.id !== erroId),
      )
    }

    try {
      let idSessao = sessaoId
      if (!idSessao) {
        // O título da conversa é o começo da primeira pergunta.
        const sessao = await criarSessao(tituloDaPergunta(pergunta))
        idSessao = sessao.id
        setSessaoId(sessao.id)
      }

      const resultado = await enviarMensagem(idSessao, pergunta)
      setMensagens((atuais) => [
        ...atuais,
        criarMensagemAssistente(
          resultado.resposta.conteudo,
          resultado.resposta.fontes,
        ),
      ])
    } catch (causa) {
      const erro = causa instanceof AssistenteServiceError ? causa : null
      setMensagens((atuais) => [
        ...atuais,
        criarMensagemErro(
          erro?.message ??
            'Não foi possível obter uma resposta. Tente novamente.',
          perguntaId,
          pergunta,
          erro?.status,
        ),
      ])
    } finally {
      travaEnvioRef.current = false
      setRespondendo(false)
    }
  }

  function enviarPergunta(perguntaRecebida = perguntaDigitada): void {
    const pergunta = perguntaRecebida.trim()
    if (!pergunta || travaEnvioRef.current) return

    const mensagemUsuario = criarMensagemUsuario(pergunta)
    setMensagens((atuais) => [...atuais, mensagemUsuario])
    setPerguntaDigitada('')
    // O foco volta ao campo mesmo quando o envio foi iniciado pelo botão.
    campoRef.current?.focus()
    void processarPergunta(pergunta, mensagemUsuario.id)
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
    void processarPergunta(mensagem.pergunta, mensagem.perguntaId, mensagem.id)
  }

  return (
    <section className={styles.page} aria-labelledby="assistente-titulo">
      <header className={styles.header}>
        <div className={styles.iconeCabecalho} aria-hidden="true">
          <SparklesIcon />
        </div>
        <div>
          <h1 id="assistente-titulo" className={styles.titulo}>
            Assistente de IA
          </h1>
          <p className={styles.subtitulo}>
            Tire dúvidas usando os documentos e as orientações da empresa.
          </p>
        </div>
      </header>

      <div className={styles.painelConversa}>
        <div
          className={styles.mensagens}
          role="log"
          aria-label="Conversa com o assistente"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {mensagens.length === 0 ? (
            <div className={styles.boasVindas}>
              <div className={styles.iconeBoasVindas} aria-hidden="true">
                <SparklesIcon />
              </div>
              <h2>Como posso ajudar?</h2>
              <p>
                Pergunte sobre processos, políticas ou materiais internos. As
                respostas podem incluir links para os documentos usados como
                fonte.
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
                      'Você'
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
                </div>
                {mensagem.tipo !== 'erro' && (
                  <p className={styles.textoMensagem}>{mensagem.conteudo}</p>
                )}

                {mensagem.tipo === 'assistente' &&
                  mensagem.fontes.length > 0 && (
                    <section
                      className={styles.fontes}
                      aria-label="Fontes da resposta"
                    >
                      <h3>Fontes</h3>
                      <ul>
                        {mensagem.fontes.map((fonte, indice) => (
                          <li key={`${fonte}-${indice}`}>
                            <Link to={linkParaFonte(fonte)}>
                              <DocumentIcon />
                              <span>{fonte}</span>
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
                    <button
                      type="button"
                      className={styles.botaoTentarNovamente}
                      disabled={respondendo}
                      onClick={() => tentarNovamente(mensagem)}
                    >
                      Tentar novamente
                    </button>
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
              O assistente está respondendo…
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
            placeholder="Escreva sua pergunta…"
            rows={2}
            maxLength={2000}
            disabled={respondendo}
          />
          <div className={styles.rodapeCompositor}>
            <span>Enter para enviar · Shift+Enter para nova linha</span>
            <button
              type="submit"
              className={styles.botaoEnviar}
              disabled={respondendo || perguntaDigitada.trim().length === 0}
            >
              <span>Enviar</span>
              <SendIcon />
            </button>
          </div>
        </form>
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
