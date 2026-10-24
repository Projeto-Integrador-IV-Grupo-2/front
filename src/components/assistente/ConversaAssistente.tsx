import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { useAssistente } from '../../hooks/useAssistente.ts'
import { useAuth } from '../../hooks/useAuth.ts'
import { caminhoAssistente } from '../../routes/paths.ts'
import type { UserRole } from '../../types/user.ts'
import {
  IconeArquivo,
  IconeCodigo,
  IconeEnviar,
  IconeFluxo,
  IconeGrafico,
  IconePessoas,
  MarcaNexo,
} from './icones.tsx'
import styles from './ConversaAssistente.module.css'

/** Atalhos por tema, acima da conversa (protótipo). */
const TEMAS: Array<{ rotulo: string; icone: ReactNode; pergunta: string }> = [
  {
    rotulo: 'Documentos e políticas',
    icone: <IconeArquivo tamanho={14} />,
    pergunta: 'Onde encontro as políticas internas da empresa?',
  },
  {
    rotulo: 'Códigos e sistemas',
    icone: <IconeCodigo tamanho={14} />,
    pergunta: 'Qual o padrão de nomes no catálogo de APIs internas?',
  },
  {
    rotulo: 'Processos e procedimentos',
    icone: <IconeFluxo tamanho={14} />,
    pergunta: 'Como funciona o fechamento mensal da operação?',
  },
  {
    rotulo: 'Pessoas e áreas',
    icone: <IconePessoas tamanho={14} />,
    pergunta: 'Quem é responsável pela área de Operações?',
  },
  {
    rotulo: 'Meu desenvolvimento',
    icone: <IconeGrafico tamanho={14} />,
    pergunta: 'O que falta no meu PDI?',
  },
]

/** Sugestões do estado vazio: quem gerencia pergunta de gestão. */
const SUGESTOES: Record<'gestao' | 'colaborador', string[]> = {
  gestao: [
    'Onde fica a política de reembolso?',
    'Qual o padrão de branch e code review?',
    'Quem responde pela área de Operações?',
    'Quais metas posso colocar no PDI da equipe?',
  ],
  colaborador: [
    'Como solicito férias?',
    'Como abrir um chamado de TI?',
    'Qual o padrão de nomes das APIs internas?',
    'O que falta no meu PDI?',
  ],
}

function iniciais(nome: string | undefined): string {
  const partes = (nome ?? '').trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase() || 'EU'
}

function sugestoesPara(papel: UserRole | undefined): string[] {
  return papel === 'COLABORADOR' || !papel
    ? SUGESTOES.colaborador
    : SUGESTOES.gestao
}

/**
 * Área de conversa. Só fala com o contexto do assistente: não sabe que o
 * histórico existe — quem avisa o painel é o canal (Observer) do contexto.
 */
export function ConversaAssistente() {
  const { user } = useAuth()
  const {
    situacao,
    mensagens,
    erroConversa,
    enviando,
    erroEnvio,
    enviarPergunta,
    recarregarConversa,
  } = useAssistente()
  const [texto, setTexto] = useState('')
  const fimRef = useRef<HTMLDivElement>(null)
  const campoRef = useRef<HTMLInputElement>(null)

  // Mensagem nova (ou conversa aberta) leva a rolagem até o fim.
  useEffect(() => {
    fimRef.current?.scrollIntoView?.({ block: 'end' })
  }, [mensagens.length, enviando])

  async function perguntar(pergunta: string) {
    setTexto('')
    const aceita = await enviarPergunta(pergunta)
    if (!aceita) {
      // Falhou: a pergunta volta ao campo para não ser digitada de novo.
      setTexto(pergunta)
    }
    campoRef.current?.focus()
  }

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    if (texto.trim()) {
      void perguntar(texto)
    }
  }

  const podeEscrever = situacao === 'nova' || situacao === 'pronta'
  const vazia = situacao === 'nova' && mensagens.length === 0

  return (
    <section className={styles.conversa} aria-label="Conversa com o assistente">
      <div className={styles.temas}>
        {TEMAS.map((tema) => (
          <button
            key={tema.rotulo}
            type="button"
            className={styles.tema}
            onClick={() => void perguntar(tema.pergunta)}
            disabled={!podeEscrever || enviando}
          >
            {tema.icone}
            {tema.rotulo}
          </button>
        ))}
      </div>

      <div className={styles.caixa}>
        <div className={styles.mensagens} aria-live="polite">
          {situacao === 'carregando' && (
            <p className={styles.centro} role="status">
              Carregando conversa…
            </p>
          )}

          {situacao === 'nao-encontrada' && (
            <div className={styles.centro}>
              <h2 className={styles.tituloVazio}>Conversa não encontrada</h2>
              <p className={styles.textoVazio}>
                Ela pode ter sido apagada, ou o link é de outra pessoa.
              </p>
              <Link to={caminhoAssistente()} className={styles.botaoSecundario}>
                Começar uma conversa nova
              </Link>
            </div>
          )}

          {situacao === 'erro' && (
            <div className={styles.centro} role="alert">
              <p className={styles.textoVazio}>{erroConversa}</p>
              <button
                type="button"
                className={styles.botaoSecundario}
                onClick={recarregarConversa}
              >
                Tentar de novo
              </button>
            </div>
          )}

          {vazia && (
            <div className={styles.centro}>
              <div className={styles.marca}>
                <MarcaNexo />
              </div>
              <h2 className={styles.tituloVazio}>Como posso ajudar?</h2>
              <p className={styles.textoVazio}>
                Consulto a base de conhecimento da empresa — documentos,
                políticas, procedimentos, códigos e sistemas — e também o seu
                histórico de trilhas e PDI.
              </p>
              <div className={styles.sugestoes}>
                {sugestoesPara(user?.papel).map((sugestao) => (
                  <button
                    key={sugestao}
                    type="button"
                    className={styles.sugestao}
                    onClick={() => void perguntar(sugestao)}
                    disabled={enviando}
                  >
                    {sugestao}
                  </button>
                ))}
              </div>
            </div>
          )}

          {podeEscrever &&
            mensagens.map((mensagem) => {
              const minha = mensagem.papel === 'USUARIO'
              return (
                <article
                  key={mensagem.id}
                  className={`${styles.linha} ${minha ? styles.minha : ''}`}
                  aria-label={
                    minha ? 'Você perguntou' : 'O assistente respondeu'
                  }
                >
                  <span className={styles.avatar} aria-hidden="true">
                    {minha ? iniciais(user?.nomeCompleto) : 'IA'}
                  </span>
                  <div className={styles.conteudo}>
                    <p className={styles.balao}>{mensagem.conteudo}</p>
                    {mensagem.fontes.length > 0 && (
                      <ul className={styles.fontes} aria-label="Fontes">
                        {mensagem.fontes.map((fonte) => (
                          <li key={fonte} className={styles.fonte}>
                            {fonte}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              )
            })}

          {enviando && (
            <div className={styles.linha} role="status">
              <span className={styles.avatar} aria-hidden="true">
                IA
              </span>
              <p className={`${styles.balao} ${styles.digitando}`}>
                <span className="visually-hidden">
                  O assistente está respondendo
                </span>
                <span aria-hidden="true" className={styles.pontos}>
                  <span />
                  <span />
                  <span />
                </span>
              </p>
            </div>
          )}
          <div ref={fimRef} />
        </div>

        {erroEnvio && (
          <p className={styles.erroEnvio} role="alert">
            {erroEnvio}
          </p>
        )}

        <form className={styles.entrada} onSubmit={aoEnviar}>
          <label htmlFor="pergunta-assistente" className="visually-hidden">
            Pergunta para o assistente
          </label>
          <input
            ref={campoRef}
            id="pergunta-assistente"
            className={styles.campo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: qual o padrão de nomes no repositório de integrações?"
            autoComplete="off"
            disabled={!podeEscrever}
          />
          <button
            type="submit"
            className={styles.enviar}
            aria-label="Enviar"
            disabled={!podeEscrever || enviando || !texto.trim()}
          >
            <IconeEnviar tamanho={15} />
          </button>
        </form>
      </div>
    </section>
  )
}
