import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type {
  MensagemAssistente,
  RespostaPergunta,
  SessaoAssistente,
} from '../../types/assistente.ts'
import type { Pagina } from '../../types/usuario.ts'

/**
 * Backend de mentira do assistente, enquanto os endpoints de sessões e
 * mensagens (Task 7) não existem. É um *adapter* do Axios, no mesmo molde de
 * `trilhasMock.ts`: o `assistenteService` faz as mesmas chamadas HTTP e só
 * troca quem responde. Quando o backend chegar, basta
 * `VITE_ASSISTENTE_MOCK=false` (e depois apagar este arquivo junto da flag).
 *
 * As respostas do assistente são fixas, por palavra-chave, copiadas do
 * protótipo. Ao contrário do mock das trilhas, os dados ficam no
 * `localStorage`: sem isso, recarregar a página perderia a conversa recém-
 * criada e não daria para ver o "F5 mantém a conversa aberta" funcionando.
 */

interface RegistroSessao extends SessaoAssistente {
  /** Conversa de outro usuário: existe, mas responde 404 a quem está logado. */
  deOutroUsuario?: boolean
  mensagens: MensagemAssistente[]
}

// Nos testes o mock responde na hora; no navegador, com um atraso de rede.
const SEM_ATRASO = import.meta.env.MODE === 'test'
const LATENCIA_MS = SEM_ATRASO ? 0 : 300
const LATENCIA_RESPOSTA_MS = SEM_ATRASO ? 0 : 700
const CHAVE_STORAGE = 'nexo:assistente-mock'

/**
 * Conversa de outro usuário, para conferir o "conversa não encontrada":
 * abra `/assistente/c9000000-0000-4000-8000-000000000001`.
 */
export const ID_CONVERSA_DE_OUTRO_USUARIO =
  'c9000000-0000-4000-8000-000000000001'

/** Conversa sobre reembolso, citada no Histórico. */
export const ID_CONVERSA_REEMBOLSO = 'c1000000-0000-4000-8000-000000000001'

interface Resposta {
  texto: string
  fontes: string[]
}

/** Mesmas respostas do protótipo, escolhidas por palavra-chave. */
function responderPergunta(pergunta: string): Resposta {
  const s = pergunta.toLowerCase()
  if (/(reembolso|despesa|nota fiscal)/.test(s))
    return {
      texto:
        'Reembolsos a clientes seguem a Política de Reembolso v3: o pedido deve ser aberto em até 7 dias da compra, com motivo e comprovante. Até R$ 500 a aprovação é do coordenador da área; acima disso passa por Financeiro. O prazo médio de retorno é de 2 dias úteis.',
      fontes: [
        'Política de Reembolso v3 · Atendimento',
        'Manual de Benefícios v2 · Pessoas',
      ],
    }
  if (
    /(código|codigo|api|repositório|repositorio|branch|deploy|integra|endpoint|nomenclatura)/.test(
      s,
    )
  )
    return {
      texto:
        'No catálogo de APIs internas (v5), toda integração nova usa autenticação por token de serviço e segue o padrão de nomes recurso.acao (ex.: pedido.criar). Branches seguem tipo/descricao-curta e todo merge exige uma revisão aprovada, conforme o guia de Padrões de Código v2.1.',
      fontes: [
        'Catálogo de APIs internas v5 · Tecnologia',
        'Padrões de código v2.1 · Tecnologia',
      ],
    }
  if (
    /(férias|ferias|benefício|beneficio|salário|salario|plano de saúde|home office|rh)/.test(
      s,
    )
  )
    return {
      texto:
        'Férias podem ser solicitadas a partir de 12 meses de casa, com 30 dias de antecedência e no máximo 2 períodos. Benefícios ativos: plano de saúde, vale-refeição e auxílio home office — todos detalhados no manual de Benefícios v2.',
      fontes: ['Benefícios, férias e reembolso v2 · Pessoas'],
    }
  if (/(lgpd|dado|privacidade|vazamento|compliance)/.test(s))
    return {
      texto:
        'Pela LGPD, dados sensíveis incluem saúde, origem racial, religião e biometria. Qualquer incidente deve ser comunicado ao encarregado de dados em até 24h e registrado como chamado de compliance. O material Fundamentos de LGPD v2 está aguardando revisão desde junho.',
      fontes: ['Fundamentos de LGPD v2 · Compliance'],
    }
  if (/(chamado|suporte|\bti\b|sistema fora|erro)/.test(s))
    return {
      texto:
        'Chamados internos são abertos no portal de suporte, categoria + prioridade obrigatórias. Prioridade alta tem SLA de 4h úteis; normal, 1 dia útil. O vídeo "Como registrar um chamado interno" mostra o fluxo completo em 4 minutos.',
      fontes: ['Como registrar um chamado interno · Tecnologia'],
    }
  if (/(pdi|meta|desenvolvimento|carreira|avalia)/.test(s))
    return {
      texto:
        'No seu PDI há 3 metas: negociação (em andamento, 9 dias), refazer LGPD (atrasada) e comunicação assertiva (concluída). Considerando a reprovação em LGPD, o próximo passo mais eficaz é revisar o material de compliance antes de reabrir a avaliação.',
      fontes: ['PDI · ciclo atual', 'Fundamentos de LGPD v2 · Compliance'],
    }
  if (/(processo comercial|venda|funil|proposta|contrato)/.test(s))
    return {
      texto:
        'O processo comercial tem 6 etapas: prospecção, qualificação, diagnóstico, proposta, negociação e fechamento. A proposta precisa de aprovação do coordenador quando o desconto passa de 12%. O documento está marcado para revisão — a versão vigente é a v4.',
      fontes: ['Processo Comercial Completo v4 · Vendas'],
    }
  if (/(fechamento|operaç|operac|checklist)/.test(s))
    return {
      texto:
        'O fechamento mensal segue o checklist v6: conferência de lançamentos até o 3º dia útil, validação de estoque no 4º e envio do relatório consolidado no 5º. Cada ponto tem um responsável nomeado na planilha.',
      fontes: ['Procedimento de fechamento mensal v6 · Operações'],
    }
  return {
    texto:
      'Encontrei 3 conteúdos relacionados na base de conhecimento da empresa. Resumo: as regras que se aplicam ao seu caso estão nos documentos abaixo, e o responsável por cada um pode complementar. Se quiser, posso detalhar um deles ou abrir um chamado para o time responsável.',
    fontes: [
      'Base de conhecimento · 168 conteúdos',
      'Áreas: Tecnologia, Pessoas, Operações',
    ],
  }
}

let sequencia = 0
function novoId(prefixo: string): string {
  sequencia += 1
  const sufixo = `${Date.now().toString(16)}${sequencia.toString(16)}`
    .padStart(12, '0')
    .slice(-12)
  return `${prefixo}-0000-4000-8000-${sufixo}`
}

function mensagem(
  papel: MensagemAssistente['papel'],
  conteudo: string,
  criadoEm: string,
  fontes: string[] = [],
): MensagemAssistente {
  return { id: novoId('m0000000'), papel, conteudo, fontes, criadoEm }
}

/** Uma conversa já respondida, `minutosAtras` minutos antes de agora. */
function conversaSemente(
  id: string,
  pergunta: string,
  minutosAtras: number,
  titulo = pergunta,
): RegistroSessao {
  const quando = new Date(Date.now() - minutosAtras * 60_000)
  const respondidaEm = new Date(quando.getTime() + 4_000).toISOString()
  const { texto, fontes } = responderPergunta(pergunta)
  return {
    id,
    titulo,
    criadoEm: quando.toISOString(),
    atualizadoEm: respondidaEm,
    mensagens: [
      mensagem('USUARIO', pergunta, quando.toISOString()),
      mensagem('ASSISTENTE', texto, respondidaEm, fontes),
    ],
  }
}

const HORA = 60
const DIA = 24 * HORA

/** Perguntas das conversas iniciais: o bastante para paginar o histórico. */
const PERGUNTAS_SEMENTE: Array<[string, number]> = [
  ['Qual o padrão de branch e code review?', 3 * HORA],
  ['Como solicito férias?', 20 * HORA],
  ['Como abrir um chamado de TI?', DIA + 2 * HORA],
  ['O que falta no meu PDI?', DIA + 6 * HORA],
  ['Quais dados são sensíveis pela LGPD?', 2 * DIA],
  ['Como funciona o fechamento mensal da operação?', 3 * DIA],
  ['Qual o padrão de nomes no catálogo de APIs internas?', 4 * DIA],
  ['Quando a proposta comercial precisa de aprovação?', 5 * DIA],
  ['Onde encontro as políticas internas da empresa?', 6 * DIA],
  ['O auxílio home office cobre internet?', 8 * DIA],
  ['Qual o SLA de um chamado de prioridade alta?', 9 * DIA],
  ['Como reporto um incidente de vazamento de dados?', 11 * DIA],
  ['Quem aprova reembolso acima de R$ 500?', 12 * DIA],
  ['Quais são as etapas do processo comercial?', 14 * DIA],
  ['Como faço deploy de uma integração nova?', 16 * DIA],
  ['Posso dividir minhas férias em dois períodos?', 18 * DIA],
  ['O que é cobrado na avaliação de LGPD?', 21 * DIA],
  ['Como registrar um chamado interno?', 24 * DIA],
  ['Qual o checklist do fechamento mensal?', 27 * DIA],
  ['Quais metas posso colocar no meu PDI?', 30 * DIA],
  ['Como funciona o plano de saúde?', 35 * DIA],
  ['Qual o desconto máximo sem aprovação?', 40 * DIA],
  ['Onde fica o guia de padrões de código?', 46 * DIA],
]

function sementes(): RegistroSessao[] {
  const iniciais = [
    conversaSemente(
      ID_CONVERSA_REEMBOLSO,
      'Onde fica a política de reembolso?',
      40,
      'Política de reembolso',
    ),
    ...PERGUNTAS_SEMENTE.map(([pergunta, minutos], indice) =>
      conversaSemente(
        `c1000000-0000-4000-8000-${String(indice + 2).padStart(12, '0')}`,
        pergunta,
        minutos,
      ),
    ),
  ]
  return [
    ...iniciais,
    {
      ...conversaSemente(
        ID_CONVERSA_DE_OUTRO_USUARIO,
        'Qual o meu saldo de férias?',
        2 * HORA,
      ),
      deOutroUsuario: true,
    },
  ]
}

let sessoes: RegistroSessao[] | null = null

function carregar(): RegistroSessao[] {
  if (sessoes) {
    return sessoes
  }
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE)
    sessoes = salvo ? (JSON.parse(salvo) as RegistroSessao[]) : sementes()
  } catch {
    sessoes = sementes()
  }
  return sessoes
}

function salvar(): void {
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(sessoes))
  } catch {
    // Sem armazenamento, os dados valem só até a próxima recarga.
  }
}

/** Volta ao estado inicial (para testes do próprio mock). */
export function reiniciarAssistenteMock(): void {
  sessoes = null
  try {
    localStorage.removeItem(CHAVE_STORAGE)
  } catch {
    // ignora: ver `salvar`
  }
}

function responder<T>(
  config: InternalAxiosRequestConfig,
  status: number,
  data: T,
): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: String(status),
    headers: new AxiosHeaders(),
    config,
  }
}

/** Erro no mesmo formato do `GlobalExceptionHandler` do backend (`ApiError`). */
function falhar(
  config: InternalAxiosRequestConfig,
  status: number,
  message: string,
): never {
  const response = responder(config, status, {
    timestamp: new Date().toISOString(),
    status,
    message,
    fieldErrors: [],
  })
  throw new AxiosError(
    message,
    status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    response,
  )
}

function corpoDe(config: InternalAxiosRequestConfig): Record<string, unknown> {
  if (typeof config.data === 'string') {
    return JSON.parse(config.data) as Record<string, unknown>
  }
  return (config.data ?? {}) as Record<string, unknown>
}

function resumo({
  id,
  titulo,
  criadoEm,
  atualizadoEm,
}: RegistroSessao): SessaoAssistente {
  return { id, titulo, criadoEm, atualizadoEm }
}

function doUsuario(config: InternalAxiosRequestConfig, id: string) {
  const sessao = carregar().find((s) => s.id === id && !s.deOutroUsuario)
  if (!sessao) {
    falhar(config, 404, `Sessão não encontrada: ${id}`)
  }
  return sessao
}

function tituloValido(config: InternalAxiosRequestConfig): string {
  const titulo = String(corpoDe(config).titulo ?? '').trim()
  if (!titulo) {
    falhar(config, 400, 'Informe um título para a conversa.')
  }
  return titulo.slice(0, 80)
}

function listar(params: Record<string, unknown> = {}) {
  const page = Number(params.page ?? 0)
  const size = Number(params.size ?? 20)
  const visiveis = carregar()
    .filter((s) => !s.deOutroUsuario)
    .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
  const pagina: Pagina<SessaoAssistente> = {
    content: visiveis.slice(page * size, page * size + size).map(resumo),
    page: {
      size,
      number: page,
      totalElements: visiveis.length,
      totalPages: Math.max(1, Math.ceil(visiveis.length / size)),
    },
  }
  return pagina
}

function rotear(config: InternalAxiosRequestConfig): AxiosResponse {
  const metodo = (config.method ?? 'get').toUpperCase()
  const caminho = (config.url ?? '').replace(/^https?:\/\/[^/]+/, '')

  if (caminho === '/api/assistente/sessoes') {
    if (metodo === 'GET') {
      return responder(config, 200, listar(config.params))
    }
    if (metodo === 'POST') {
      const agora = new Date().toISOString()
      const nova: RegistroSessao = {
        id: novoId('c2000000'),
        titulo: tituloValido(config),
        criadoEm: agora,
        atualizadoEm: agora,
        mensagens: [],
      }
      carregar().push(nova)
      salvar()
      return responder(config, 201, resumo(nova))
    }
  }

  const deMensagens = /^\/api\/assistente\/sessoes\/([^/]+)\/mensagens$/.exec(
    caminho,
  )
  if (deMensagens) {
    const sessao = doUsuario(config, decodeURIComponent(deMensagens[1]))
    if (metodo === 'GET') {
      return responder(config, 200, sessao.mensagens)
    }
    if (metodo === 'POST') {
      const conteudo = String(corpoDe(config).conteudo ?? '').trim()
      if (!conteudo) {
        falhar(config, 400, 'Escreva uma pergunta.')
      }
      const perguntaEm = new Date().toISOString()
      const pergunta = mensagem('USUARIO', conteudo, perguntaEm)
      const { texto, fontes } = responderPergunta(conteudo)
      const respondidaEm = new Date(Date.now() + 1).toISOString()
      const resposta = mensagem('ASSISTENTE', texto, respondidaEm, fontes)
      sessao.mensagens.push(pergunta, resposta)
      sessao.atualizadoEm = respondidaEm
      salvar()
      const corpo: RespostaPergunta = {
        sessao: resumo(sessao),
        pergunta,
        resposta,
      }
      return responder(config, 201, corpo)
    }
  }

  const deSessao = /^\/api\/assistente\/sessoes\/([^/]+)$/.exec(caminho)
  if (deSessao) {
    const id = decodeURIComponent(deSessao[1])
    const sessao = doUsuario(config, id)
    if (metodo === 'PATCH') {
      sessao.titulo = tituloValido(config)
      salvar()
      return responder(config, 200, resumo(sessao))
    }
    if (metodo === 'DELETE') {
      sessoes = carregar().filter((s) => s.id !== id)
      salvar()
      return responder(config, 204, null)
    }
  }

  falhar(config, 404, `Rota não encontrada no mock: ${metodo} ${caminho}`)
}

export const adaptadorAssistenteMock: AxiosAdapter = (config) =>
  new Promise((resolve, reject) => {
    // A resposta da IA demora um pouco mais, para o "digitando…" aparecer.
    const respondendo =
      (config.method ?? '').toUpperCase() === 'POST' &&
      /\/mensagens$/.test(config.url ?? '')
    setTimeout(
      () => {
        try {
          resolve(rotear(config))
        } catch (erro) {
          reject(erro)
        }
      },
      respondendo ? LATENCIA_RESPOSTA_MS : LATENCIA_MS,
    )
  })
