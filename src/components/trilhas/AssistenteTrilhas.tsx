import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PainelLateral } from '../comum/PainelLateral.tsx'
import {
  pedirAjudaTrilhas,
  TrilhaServiceError,
} from '../../services/trilhaService.ts'
import type { CriarTrilhaRequest } from '../../types/trilha.ts'
import { TrilhaCard } from './TrilhaCard.tsx'
import type { EstadoSugestoes } from './useSugestoesTrilhas.ts'
import styles from './AssistenteTrilhas.module.css'

interface AssistenteTrilhasProps {
  /** Sugestões já carregadas pela página; `null` enquanto não chegam ou se falharam. */
  sugestoes: EstadoSugestoes | null
  /** Quem pode criar trilhas recebe os atalhos e o rascunho pronto. */
  podeCriar: boolean
  onUsarRascunho: (rascunho: CriarTrilhaRequest) => void
  onFechar: () => void
}

interface Mensagem {
  id: number
  autor: 'voce' | 'ia'
  texto: string
  rascunho?: CriarTrilhaRequest | null
}

const ATALHOS_GESTAO = [
  'Monte uma trilha de onboarding para novos colaboradores',
  'Crie uma trilha de atendimento ao cliente',
  'Quais lacunas de conhecimento a equipe tem?',
  'Qual trilha devo fazer primeiro?',
]

const ATALHOS_COLABORADOR = [
  'Qual trilha devo fazer primeiro?',
  'Quais trilhas combinam com o meu PDI?',
  'Quero melhorar no atendimento ao cliente',
]

/**
 * Painel da IA na tela de Trilhas: as sugestões para o usuário (com o motivo
 * de cada uma) e uma conversa para pedir ajuda — inclusive para montar uma
 * trilha nova, que volta como rascunho pronto para o cadastro.
 *
 * Tudo que vem da IA (motivos e respostas) é exibido como texto simples: o
 * React escapa o conteúdo, então nada vira HTML.
 */
export function AssistenteTrilhas({
  sugestoes,
  podeCriar,
  onUsarRascunho,
  onFechar,
}: AssistenteTrilhasProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const proximoId = useRef(0)
  const fimRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fimRef.current?.scrollIntoView?.({ block: 'end' })
  }, [mensagens.length, enviando])

  const temSugestoes = sugestoes !== null && sugestoes.sugestoes.length > 0
  const atalhos = podeCriar ? ATALHOS_GESTAO : ATALHOS_COLABORADOR

  function adicionar(mensagem: Omit<Mensagem, 'id'>) {
    proximoId.current += 1
    const id = proximoId.current
    setMensagens((atuais) => [...atuais, { ...mensagem, id }])
  }

  async function perguntar(pergunta: string) {
    const limpa = pergunta.trim()
    if (!limpa || enviando) {
      return
    }
    setTexto('')
    setErro(null)
    setEnviando(true)
    adicionar({ autor: 'voce', texto: limpa })
    try {
      const resposta = await pedirAjudaTrilhas(limpa)
      adicionar({
        autor: 'ia',
        texto: resposta.texto,
        rascunho: resposta.rascunho,
      })
    } catch (causa) {
      setErro(
        causa instanceof TrilhaServiceError
          ? causa.message
          : 'A IA não conseguiu responder agora.',
      )
      setTexto(limpa)
    } finally {
      setEnviando(false)
    }
  }

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    void perguntar(texto)
  }

  return (
    <PainelLateral
      titulo="Assistente de trilhas"
      subtitulo={
        podeCriar
          ? 'Sugestões para você e ajuda da IA para montar trilhas novas.'
          : 'Sugestões para você e ajuda da IA para escolher o que estudar.'
      }
      onFechar={onFechar}
    >
      <div className={styles.conteudo}>
        {temSugestoes && (
          <section aria-labelledby="titulo-sugestoes" className={styles.bloco}>
            <div className={styles.cabecalhoBloco}>
              <h3 id="titulo-sugestoes" className={styles.tituloBloco}>
                Sugeridas para você
              </h3>
              <span
                className={
                  sugestoes.geradoPorIa
                    ? styles.selo
                    : `${styles.selo} ${styles.seloArea}`
                }
              >
                {sugestoes.geradoPorIa
                  ? 'Sugestão da IA'
                  : 'Recomendação por área'}
              </span>
            </div>
            {!sugestoes.geradoPorIa && (
              <p className={styles.nota}>
                {sugestoes.aviso ??
                  'A IA não está disponível agora; estas são recomendações por área.'}
              </p>
            )}
            <ul className={styles.sugestoes} aria-label="Sugeridas para você">
              {sugestoes.sugestoes.map(({ motivo, ...trilha }) => (
                <li key={trilha.id} className={styles.sugestao}>
                  <ul className={styles.cartao}>
                    {/* A sugestão já tem o formato do resumo da listagem. */}
                    <TrilhaCard trilha={trilha} />
                  </ul>
                  <p className={styles.motivo}>
                    <span className={styles.porque}>Por que: </span>
                    {motivo}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="titulo-ajuda" className={styles.bloco}>
          <h3 id="titulo-ajuda" className={styles.tituloBloco}>
            Peça ajuda à IA
          </h3>

          {mensagens.length === 0 && (
            <>
              <p className={styles.nota}>
                {podeCriar
                  ? 'Descreva a trilha que você precisa e eu monto um rascunho com nome, objetivos e prazo. Também ajudo a achar lacunas de conhecimento da equipe.'
                  : 'Pergunte o que estudar, quais trilhas combinam com o seu PDI ou como se preparar para a próxima avaliação.'}
              </p>
              <div className={styles.atalhos}>
                {atalhos.map((atalho) => (
                  <button
                    key={atalho}
                    type="button"
                    className={styles.atalho}
                    onClick={() => void perguntar(atalho)}
                    disabled={enviando}
                  >
                    {atalho}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className={styles.conversa} aria-live="polite">
            {mensagens.map((mensagem) => (
              <div
                key={mensagem.id}
                className={
                  mensagem.autor === 'voce'
                    ? `${styles.mensagem} ${styles.minha}`
                    : styles.mensagem
                }
              >
                <span className="visually-hidden">
                  {mensagem.autor === 'voce' ? 'Você:' : 'IA:'}
                </span>
                <p className={styles.balao}>{mensagem.texto}</p>
                {mensagem.rascunho && podeCriar && (
                  <Rascunho
                    rascunho={mensagem.rascunho}
                    onUsar={() => onUsarRascunho(mensagem.rascunho!)}
                  />
                )}
              </div>
            ))}
            {enviando && (
              <p className={styles.digitando} role="status">
                A IA está pensando…
              </p>
            )}
            <div ref={fimRef} />
          </div>

          {erro && (
            <p className={styles.erro} role="alert">
              {erro}
            </p>
          )}

          <form className={styles.entrada} onSubmit={aoEnviar}>
            <label htmlFor="pergunta-trilhas" className="visually-hidden">
              Pergunta para a IA sobre trilhas
            </label>
            <input
              id="pergunta-trilhas"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={
                podeCriar
                  ? 'Ex.: monte uma trilha de LGPD para o time'
                  : 'Ex.: o que estudar para a próxima avaliação?'
              }
              autoComplete="off"
            />
            <button
              type="submit"
              className={styles.enviar}
              disabled={enviando || !texto.trim()}
            >
              Enviar
            </button>
          </form>
        </section>
      </div>
    </PainelLateral>
  )
}

function Rascunho({
  rascunho,
  onUsar,
}: {
  rascunho: CriarTrilhaRequest
  onUsar: () => void
}) {
  return (
    <div className={styles.rascunho}>
      <p className={styles.rascunhoRotulo}>Rascunho da trilha</p>
      <p className={styles.rascunhoNome}>{rascunho.nome}</p>
      <dl className={styles.rascunhoCampos}>
        {rascunho.prazoDias !== null && (
          <>
            <dt>Prazo</dt>
            <dd>{rascunho.prazoDias} dias</dd>
          </>
        )}
        {rascunho.objetivos && (
          <>
            <dt>Objetivos</dt>
            <dd>{rascunho.objetivos}</dd>
          </>
        )}
        {rascunho.descricao && (
          <>
            <dt>Descrição</dt>
            <dd>{rascunho.descricao}</dd>
          </>
        )}
      </dl>
      <button type="button" className={styles.usar} onClick={onUsar}>
        Criar com este rascunho
      </button>
    </div>
  )
}
