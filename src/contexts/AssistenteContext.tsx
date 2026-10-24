import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { caminhoAssistente } from '../routes/paths.ts'
import {
  AssistenteServiceError,
  criarSessao,
  enviarMensagem,
  listarMensagens,
  tituloDaPergunta,
} from '../services/assistenteService.ts'
import type { MensagemAssistente } from '../types/assistente.ts'
import { HTTP_STATUS } from '../utils/errorHandler.ts'
import {
  criarCanalAssistente,
  type CanalAssistente,
} from './eventosAssistente.ts'

export type SituacaoConversa =
  'nova' | 'carregando' | 'pronta' | 'nao-encontrada' | 'erro'

export interface AssistenteContextValue {
  /** Conversa aberta (vem da URL); `null` numa conversa nova. */
  sessaoId: string | null
  situacao: SituacaoConversa
  mensagens: MensagemAssistente[]
  /** Erro ao carregar a conversa (situação `erro`). */
  erroConversa: string | null
  enviando: boolean
  erroEnvio: string | null
  /** `true` se a pergunta foi aceita; `false` devolve o texto ao campo. */
  enviarPergunta: (texto: string) => Promise<boolean>
  recarregarConversa: () => void
  /** Observer: avisa o histórico sem a conversa conhecê-lo. */
  canal: CanalAssistente
}

export const AssistenteContext = createContext<
  AssistenteContextValue | undefined
>(undefined)

interface Conversa {
  sessaoId: string | null
  situacao: Exclude<SituacaoConversa, 'carregando'>
  mensagens: MensagemAssistente[]
  erro: string | null
}

const CONVERSA_NOVA: Conversa = {
  sessaoId: null,
  situacao: 'nova',
  mensagens: [],
  erro: null,
}

interface AssistenteProviderProps {
  /** Conversa aberta, lida da URL (`/assistente/:sessaoId`). */
  sessaoId: string | null
  children: ReactNode
}

function mensagemTemporaria(conteudo: string): MensagemAssistente {
  return {
    id: `temporaria-${Date.now()}`,
    papel: 'USUARIO',
    conteudo,
    fontes: [],
    criadoEm: new Date().toISOString(),
  }
}

/**
 * Fonte única do estado da conversa com o assistente. A URL manda: o
 * provider carrega a conversa de `sessaoId` e, ao criar uma nova, leva a URL
 * até ela — é isso que faz o link e o F5 funcionarem.
 */
export function AssistenteProvider({
  sessaoId,
  children,
}: AssistenteProviderProps) {
  const navigate = useNavigate()
  const [canal] = useState(criarCanalAssistente)
  const [conversa, setConversa] = useState<Conversa>(CONVERSA_NOVA)
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)
  /**
   * Conversa que acabou de nascer aqui: as mensagens já estão em memória,
   * então a troca de URL que vem em seguida não precisa buscá-las de novo.
   */
  const criadaAquiRef = useRef<string | null>(null)

  useEffect(() => {
    if (!sessaoId) {
      return
    }
    if (criadaAquiRef.current === sessaoId) {
      return
    }
    criadaAquiRef.current = null

    const controlador = new AbortController()
    listarMensagens(sessaoId, { signal: controlador.signal })
      .then((mensagens) => {
        if (!controlador.signal.aborted) {
          setConversa({ sessaoId, situacao: 'pronta', mensagens, erro: null })
        }
      })
      .catch((causa: unknown) => {
        if (controlador.signal.aborted) {
          return
        }
        const naoEncontrada =
          causa instanceof AssistenteServiceError &&
          causa.status === HTTP_STATUS.NOT_FOUND
        setConversa({
          sessaoId,
          situacao: naoEncontrada ? 'nao-encontrada' : 'erro',
          mensagens: [],
          erro:
            causa instanceof Error
              ? causa.message
              : 'Não foi possível carregar a conversa.',
        })
      })

    return () => controlador.abort()
  }, [sessaoId, recarga])

  // Derivado, não sincronizado: a conversa em memória só vale se for a da URL.
  const atual: Conversa | null =
    conversa.sessaoId === sessaoId
      ? conversa
      : sessaoId === null
        ? CONVERSA_NOVA
        : null

  const enviarPergunta = useCallback(
    async (texto: string): Promise<boolean> => {
      const conteudo = texto.trim()
      if (!conteudo || enviando) {
        return false
      }
      setEnviando(true)
      setErroEnvio(null)

      // A pergunta aparece na hora; some de novo se o envio falhar.
      const temporaria = mensagemTemporaria(conteudo)
      let id = sessaoId
      setConversa({
        sessaoId: id,
        situacao: 'pronta',
        mensagens: [...(atual?.mensagens ?? []), temporaria],
        erro: null,
      })

      try {
        if (!id) {
          const sessao = await criarSessao(tituloDaPergunta(conteudo))
          const criada = sessao.id
          id = criada
          criadaAquiRef.current = criada
          setConversa((anterior) =>
            anterior.sessaoId === null
              ? { ...anterior, sessaoId: criada }
              : anterior,
          )
          // Conversa nova não deixa rastro no histórico do navegador: o
          // "voltar" não deve cair numa tela em branco.
          navigate(caminhoAssistente(criada), { replace: true })
          canal.emitir({ tipo: 'sessao-atualizada', sessao })
        }
        const alvo = id

        const { sessao, pergunta, resposta } = await enviarMensagem(
          alvo,
          conteudo,
        )
        // Se o usuário já trocou de conversa, a resposta não invade a outra.
        setConversa((anterior) =>
          anterior.sessaoId === alvo
            ? {
                ...anterior,
                mensagens: [
                  ...anterior.mensagens.filter((m) => m.id !== temporaria.id),
                  pergunta,
                  resposta,
                ],
              }
            : anterior,
        )
        canal.emitir({ tipo: 'sessao-atualizada', sessao })
        return true
      } catch (causa) {
        setConversa((anterior) =>
          anterior.sessaoId === id
            ? {
                ...anterior,
                mensagens: anterior.mensagens.filter(
                  (m) => m.id !== temporaria.id,
                ),
              }
            : anterior,
        )
        setErroEnvio(
          causa instanceof Error
            ? causa.message
            : 'Não foi possível enviar a pergunta.',
        )
        return false
      } finally {
        setEnviando(false)
      }
    },
    [atual?.mensagens, canal, enviando, navigate, sessaoId],
  )

  const recarregarConversa = useCallback(() => setRecarga((n) => n + 1), [])

  const valor = useMemo<AssistenteContextValue>(
    () => ({
      sessaoId,
      situacao: atual?.situacao ?? 'carregando',
      mensagens: atual?.mensagens ?? [],
      erroConversa: atual?.erro ?? null,
      enviando,
      erroEnvio,
      enviarPergunta,
      recarregarConversa,
      canal,
    }),
    [
      atual,
      canal,
      enviando,
      enviarPergunta,
      erroEnvio,
      recarregarConversa,
      sessaoId,
    ],
  )

  return (
    <AssistenteContext.Provider value={valor}>
      {children}
    </AssistenteContext.Provider>
  )
}
