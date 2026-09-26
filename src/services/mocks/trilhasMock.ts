import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { StatusProgresso } from '../../types/trilha.ts'
import type { Pagina, RecursoResumo } from '../../types/usuario.ts'

/**
 * Backend de mentira para as trilhas, enquanto os endpoints não estão todos
 * no ar. É um *adapter* do Axios: o `trilhaService` faz exatamente as mesmas
 * chamadas HTTP (mesmos caminhos, corpos e interceptors de sessão) e só troca
 * quem responde. Para usar a API de verdade basta `VITE_TRILHAS_MOCK=false`
 * no `.env`; quando o backend estiver completo, este arquivo pode ser apagado
 * junto com a flag.
 *
 * As respostas seguem os records do backend (`TrilhaResumoResponse`,
 * `ProgressoTrilhaResponse`, `PagedModel`, `ApiError`). Os dados vivem em
 * memória: recarregar a página volta ao estado inicial.
 */

interface RegistroProgresso {
  id: string
  status: StatusProgresso
  prazo: string | null
  atribuidoEm: string
  concluidoEm: string | null
}

interface RegistroTrilha {
  id: string
  nome: string
  descricao: string | null
  area: RecursoResumo | null
  objetivos: string | null
  prazoDias: number | null
  ativo: boolean
  criadoEm: string
  progresso: RegistroProgresso | null
}

const LATENCIA_MS = 350

const AREAS: RecursoResumo[] = [
  { id: 'a1000000-0000-4000-8000-000000000001', nome: 'Atendimento' },
  { id: 'a1000000-0000-4000-8000-000000000002', nome: 'Comercial' },
  { id: 'a1000000-0000-4000-8000-000000000003', nome: 'Jurídico' },
  { id: 'a1000000-0000-4000-8000-000000000004', nome: 'Tecnologia' },
]

function diasAtras(dias: number): string {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()
}

function dataDaqui(dias: number): string {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

function estadoInicial(): RegistroTrilha[] {
  return [
    {
      id: 't1000000-0000-4000-8000-000000000001',
      nome: 'Atendimento ao Cliente',
      descricao:
        'Desenvolver habilidades de comunicação e resolução de conflitos no atendimento ao cliente.',
      area: AREAS[0],
      objetivos:
        'Desenvolver habilidades de comunicação e resolução de conflitos no atendimento.',
      prazoDias: 30,
      ativo: true,
      criadoEm: diasAtras(40),
      progresso: {
        id: 'p1000000-0000-4000-8000-000000000001',
        status: 'EM_ANDAMENTO',
        prazo: dataDaqui(9),
        atribuidoEm: diasAtras(21),
        concluidoEm: null,
      },
    },
    {
      id: 't1000000-0000-4000-8000-000000000002',
      nome: 'Onboarding Comercial',
      descricao:
        'Trilha de entrada do time comercial: produto, processo de vendas e ferramentas.',
      area: AREAS[1],
      objetivos:
        'Preparar novos vendedores para o processo comercial completo da empresa.',
      prazoDias: 45,
      ativo: true,
      criadoEm: diasAtras(90),
      progresso: null,
    },
    {
      id: 't1000000-0000-4000-8000-000000000003',
      nome: 'Fundamentos de LGPD',
      descricao:
        'Princípios da Lei Geral de Proteção de Dados aplicados à rotina de trabalho.',
      area: AREAS[2],
      objetivos:
        'Garantir compreensão dos princípios de privacidade e proteção de dados.',
      prazoDias: 15,
      ativo: true,
      criadoEm: diasAtras(120),
      progresso: {
        id: 'p1000000-0000-4000-8000-000000000003',
        status: 'CONCLUIDA',
        prazo: dataDaqui(-20),
        atribuidoEm: diasAtras(60),
        concluidoEm: diasAtras(35),
      },
    },
    {
      id: 't1000000-0000-4000-8000-000000000004',
      nome: 'Liderança para novos gestores',
      descricao:
        'Fundamentos de gestão de pessoas, feedback e condução de reuniões de equipe.',
      area: null,
      objetivos:
        'Construir uma base sólida de liderança para gestores em início de carreira.',
      prazoDias: 60,
      ativo: true,
      criadoEm: diasAtras(30),
      progresso: {
        id: 'p1000000-0000-4000-8000-000000000004',
        status: 'ATRASADA',
        prazo: dataDaqui(-3),
        atribuidoEm: diasAtras(63),
        concluidoEm: null,
      },
    },
    {
      id: 't1000000-0000-4000-8000-000000000005',
      nome: 'Segurança da Informação 2026',
      descricao:
        'Boas práticas de segurança: senhas, phishing, dispositivos e dados sensíveis.',
      area: AREAS[3],
      objetivos:
        'Reduzir incidentes de segurança causados por falha humana no dia a dia.',
      prazoDias: 20,
      ativo: true,
      criadoEm: diasAtras(10),
      progresso: null,
    },
  ]
}

let trilhas = estadoInicial()

/** Volta os dados ao estado inicial. Usado pelos testes. */
export function reiniciarTrilhasMock(): void {
  trilhas = estadoInicial()
}

/** Mesma aproximação do backend (`ProgressoTrilhaResponse.percentualDe`). */
function percentualDe(status: StatusProgresso): number {
  switch (status) {
    case 'NAO_INICIADA':
      return 0
    case 'EM_ANDAMENTO':
    case 'ATRASADA':
      return 50
    case 'CONCLUIDA':
      return 100
  }
}

function progressoDe(trilha: RegistroTrilha) {
  const recurso = { id: trilha.id, nome: trilha.nome }
  if (!trilha.progresso) {
    return {
      id: null,
      trilha: recurso,
      status: 'NAO_INICIADA' as const,
      percentual: 0,
      prazo: null,
      atribuidoEm: null,
      concluidoEm: null,
    }
  }
  return {
    ...trilha.progresso,
    trilha: recurso,
    percentual: percentualDe(trilha.progresso.status),
  }
}

function resumoDe(trilha: RegistroTrilha) {
  return {
    id: trilha.id,
    nome: trilha.nome,
    area: trilha.area,
    objetivos: trilha.objetivos,
    progresso: progressoDe(trilha),
  }
}

function paginar<T>(
  itens: T[],
  params: Record<string, unknown> | undefined,
): Pagina<T> {
  const page = Number(params?.page ?? 0)
  const size = Number(params?.size ?? 20)
  const inicio = page * size
  return {
    content: itens.slice(inicio, inicio + size),
    page: {
      size,
      number: page,
      totalElements: itens.length,
      totalPages: Math.ceil(itens.length / size),
    },
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
  fieldErrors: Array<{ field: string; message: string }> = [],
): never {
  const response = responder(config, status, {
    timestamp: new Date().toISOString(),
    status,
    error: String(status),
    message,
    path: config.url,
    fieldErrors,
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

function textoOuNulo(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null
}

function criar(config: InternalAxiosRequestConfig): AxiosResponse {
  const corpo = corpoDe(config)
  const nome = textoOuNulo(corpo.nome)
  if (!nome) {
    falhar(config, 400, 'Dados inválidos.', [
      { field: 'nome', message: 'nome é obrigatório' },
    ])
  }
  if (trilhas.some((t) => t.nome.toLowerCase() === nome.toLowerCase())) {
    falhar(config, 409, 'Já existe uma trilha com esse nome.')
  }

  const area = AREAS.find((a) => a.id === corpo.areaId) ?? null
  const prazoDias =
    typeof corpo.prazoDias === 'number' && corpo.prazoDias > 0
      ? corpo.prazoDias
      : null

  const nova: RegistroTrilha = {
    id: crypto.randomUUID(),
    nome,
    descricao: null,
    area,
    objetivos: textoOuNulo(corpo.objetivos),
    prazoDias,
    ativo: true,
    criadoEm: new Date().toISOString(),
    progresso: null,
  }
  trilhas = [...trilhas, nova]
  return responder(config, 201, resumoDe(nova))
}

function rotear(config: InternalAxiosRequestConfig): AxiosResponse {
  const metodo = (config.method ?? 'get').toUpperCase()
  const caminho = (config.url ?? '').replace(/^https?:\/\/[^/]+/, '')

  if (metodo === 'GET' && caminho === '/api/trilhas') {
    const ativas = trilhas
      .filter((t) => t.ativo)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map(resumoDe)
    return responder(config, 200, paginar(ativas, config.params))
  }

  if (metodo === 'POST' && caminho === '/api/trilhas') {
    return criar(config)
  }

  if (metodo === 'GET' && caminho === '/api/areas') {
    return responder(
      config,
      200,
      paginar(
        AREAS.map((a) => ({ ...a, ativo: true })),
        config.params,
      ),
    )
  }

  return falhar(config, 404, `Rota não simulada: ${metodo} ${caminho}`)
}

export const adaptadorTrilhasMock: AxiosAdapter = (config) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(rotear(config))
      } catch (erro) {
        reject(erro)
      }
    }, LATENCIA_MS)
  })
