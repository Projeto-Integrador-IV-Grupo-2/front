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

/** Colaboradores do diálogo "Atribuir trilha" (`GET /api/usuarios`). */
const USUARIOS = [
  {
    id: 'd1000000-0000-4000-8000-000000000001',
    nomeCompleto: 'Rafael Souza',
    email: 'rafael.souza@empresa.com',
    area: AREAS[0],
  },
  {
    id: 'd1000000-0000-4000-8000-000000000002',
    nomeCompleto: 'Ana Lima',
    email: 'ana.lima@empresa.com',
    area: AREAS[1],
  },
  {
    id: 'd1000000-0000-4000-8000-000000000003',
    nomeCompleto: 'Bruno Castro',
    email: 'bruno.castro@empresa.com',
    area: AREAS[1],
  },
  {
    id: 'd1000000-0000-4000-8000-000000000004',
    nomeCompleto: 'Carla Ferreira',
    email: 'carla.ferreira@empresa.com',
    area: AREAS[3],
  },
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
      id: 'b1000000-0000-4000-8000-000000000001',
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
        id: 'c1000000-0000-4000-8000-000000000001',
        status: 'EM_ANDAMENTO',
        prazo: dataDaqui(9),
        atribuidoEm: diasAtras(21),
        concluidoEm: null,
      },
    },
    {
      id: 'b1000000-0000-4000-8000-000000000002',
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
      id: 'b1000000-0000-4000-8000-000000000003',
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
        id: 'c1000000-0000-4000-8000-000000000003',
        status: 'CONCLUIDA',
        prazo: dataDaqui(-20),
        atribuidoEm: diasAtras(60),
        concluidoEm: diasAtras(35),
      },
    },
    {
      id: 'b1000000-0000-4000-8000-000000000004',
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
        id: 'c1000000-0000-4000-8000-000000000004',
        status: 'ATRASADA',
        prazo: dataDaqui(-3),
        atribuidoEm: diasAtras(63),
        concluidoEm: null,
      },
    },
    {
      id: 'b1000000-0000-4000-8000-000000000005',
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

/** Quem já recebeu cada trilha, por id de trilha — só para não duplicar. */
let atribuidos: Record<string, string[]> = {}

/** Volta os dados ao estado inicial. Usado pelos testes. */
export function reiniciarTrilhasMock(): void {
  trilhas = estadoInicial()
  atribuidos = {}
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

/**
 * Mesma regra do `RegraDePrazo` do backend: prazo vencido e trilha não
 * concluída já é lido como atrasado, sem esperar a rotina diária.
 */
function statusEfetivo(progresso: RegistroProgresso): StatusProgresso {
  if (progresso.status === 'CONCLUIDA' || progresso.prazo === null) {
    return progresso.status
  }
  return progresso.prazo < dataDaqui(0) ? 'ATRASADA' : progresso.status
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
  const status = statusEfetivo(trilha.progresso)
  return {
    ...trilha.progresso,
    trilha: recurso,
    status,
    percentual: percentualDe(status),
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

function detalheDe(trilha: RegistroTrilha) {
  return {
    id: trilha.id,
    nome: trilha.nome,
    descricao: trilha.descricao,
    area: trilha.area,
    objetivos: trilha.objetivos,
    prazoDias: trilha.prazoDias,
    ativo: trilha.ativo,
    criadoEm: trilha.criadoEm,
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
    descricao: textoOuNulo(corpo.descricao),
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

/**
 * Como `TrilhaService.atualizar`: 404 fora do tenant, 400 sem nome e 409 com
 * nome já usado por outra trilha. O progresso de quem já tem a trilha fica.
 */
function editar(config: InternalAxiosRequestConfig, id: string) {
  const trilha = buscarNoMock(config, id)
  const corpo = corpoDe(config)
  const nome = textoOuNulo(corpo.nome)
  if (!nome) {
    falhar(config, 400, 'Dados inválidos.', [
      { field: 'nome', message: 'nome é obrigatório' },
    ])
  }
  if (
    trilhas.some(
      (t) => t.id !== id && t.nome.toLowerCase() === nome.toLowerCase(),
    )
  ) {
    falhar(config, 409, 'Já existe uma trilha com esse nome.')
  }

  trilha.nome = nome
  trilha.descricao = textoOuNulo(corpo.descricao)
  trilha.objetivos = textoOuNulo(corpo.objetivos)
  trilha.area = AREAS.find((a) => a.id === corpo.areaId) ?? null
  trilha.prazoDias =
    typeof corpo.prazoDias === 'number' && corpo.prazoDias > 0
      ? corpo.prazoDias
      : null
  // Como a API: a edição responde com o resumo, não com o detalhe.
  return responder(config, 200, resumoDe(trilha))
}

function alternarAtivo(
  config: InternalAxiosRequestConfig,
  id: string,
  ativo: boolean,
) {
  const trilha = buscarNoMock(config, id)
  trilha.ativo = ativo
  // Resumo também, como a API — o `ativo` novo não volta na resposta.
  return responder(config, 200, resumoDe(trilha))
}

/**
 * Como `TrilhaAtribuicaoService.atribuir`: aceita uma lista de usuários ou
 * uma área, conta quantos receberam e quantos foram ignorados por já terem a
 * trilha. O mock não guarda atribuição de outras pessoas, então considera
 * ignorado só quem é dono do progresso que já existe.
 */
function atribuir(config: InternalAxiosRequestConfig, id: string) {
  const trilha = buscarNoMock(config, id)
  const corpo = corpoDe(config)
  const usuarioIds = Array.isArray(corpo.usuarioIds)
    ? (corpo.usuarioIds as string[])
    : null
  const areaId = textoOuNulo(corpo.areaId)

  const alvos = usuarioIds
    ? USUARIOS.filter((u) => usuarioIds.includes(u.id))
    : USUARIOS.filter((u) => u.area.id === areaId)
  if (alvos.length === 0) {
    falhar(config, 400, 'Dados inválidos.', [
      {
        field: usuarioIds ? 'usuarioIds' : 'areaId',
        message: 'informe ao menos um colaborador',
      },
    ])
  }

  // Quem já tem a trilha é ignorado, nunca duplicado.
  const jaTinham = atribuidos[trilha.id] ?? []
  const novos = alvos.filter((u) => !jaTinham.includes(u.id))
  atribuidos[trilha.id] = [...jaTinham, ...novos.map((u) => u.id)]
  return responder(config, 201, {
    atribuidos: novos.length,
    ignorados: alvos.length - novos.length,
    usuarioIds: novos.map((u) => u.id),
  })
}

const STATUS_ACEITOS: StatusProgresso[] = [
  'EM_ANDAMENTO',
  'CONCLUIDA',
  'ATRASADA',
]

function buscarNoMock(
  config: InternalAxiosRequestConfig,
  id: string,
): RegistroTrilha {
  const trilha = trilhas.find((t) => t.id === id)
  if (!trilha) {
    falhar(config, 404, `Trilha não encontrada: ${id}`)
  }
  return trilha
}

/** Como `TrilhaAtribuicaoService.iniciar`: cria em andamento ou devolve o existente. */
function iniciar(config: InternalAxiosRequestConfig, id: string) {
  const trilha = buscarNoMock(config, id)
  if (!trilha.progresso) {
    const prazo = trilha.prazoDias === null ? null : dataDaqui(trilha.prazoDias)
    trilha.progresso = {
      id: crypto.randomUUID(),
      status: 'EM_ANDAMENTO',
      prazo,
      atribuidoEm: new Date().toISOString(),
      concluidoEm: null,
    }
  }
  return responder(config, 200, progressoDe(trilha))
}

/** Como `TrilhaAtribuicaoService.atualizar`: 404 sem progresso, 400/422 em status inválido. */
function atualizar(config: InternalAxiosRequestConfig, id: string) {
  const trilha = buscarNoMock(config, id)
  const status = corpoDe(config).status
  if (!trilha.progresso) {
    falhar(config, 404, 'Progresso não encontrado para esta trilha')
  }
  if (status === 'NAO_INICIADA') {
    falhar(
      config,
      422,
      'Não é possível voltar um progresso já iniciado para NAO_INICIADA',
    )
  }
  if (!STATUS_ACEITOS.includes(status as StatusProgresso)) {
    falhar(config, 400, 'Dados inválidos.', [
      { field: 'status', message: 'status é obrigatório' },
    ])
  }
  trilha.progresso = {
    ...trilha.progresso,
    status: status as StatusProgresso,
    concluidoEm: status === 'CONCLUIDA' ? new Date().toISOString() : null,
  }
  return responder(config, 200, progressoDe(trilha))
}

/**
 * Listagem com os filtros de `GET /api/trilhas` (`nome`, `areaId`, `status`,
 * `minhas`). `recomendar` é ignorado: o mock não conhece a área do usuário.
 */
function listar(params: Record<string, unknown> | undefined) {
  const nome = String(params?.nome ?? '').toLocaleLowerCase('pt-BR')
  const areaId = params?.areaId as string | undefined
  const status = params?.status as StatusProgresso | undefined
  const minhas = params?.minhas === true || params?.minhas === 'true'
  const porPrazo = minhas && params?.sort === 'prazo'

  const filtradas = trilhas
    .filter((t) => t.ativo)
    .filter((t) => !nome || t.nome.toLocaleLowerCase('pt-BR').includes(nome))
    .filter((t) => !areaId || t.area?.id === areaId)
    .filter((t) => !minhas || t.progresso !== null)
    .filter(
      (t) => !status || (t.progresso?.status ?? 'NAO_INICIADA') === status,
    )
    .sort((a, b) => {
      if (porPrazo) {
        // Sem prazo vai para o fim, como na API.
        const prazoA = a.progresso?.prazo ?? '9999-12-31'
        const prazoB = b.progresso?.prazo ?? '9999-12-31'
        if (prazoA !== prazoB) {
          return prazoA.localeCompare(prazoB)
        }
      }
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
    .map(resumoDe)
  return paginar(filtradas, params)
}

function rotear(config: InternalAxiosRequestConfig): AxiosResponse {
  const metodo = (config.method ?? 'get').toUpperCase()
  const caminho = (config.url ?? '').replace(/^https?:\/\/[^/]+/, '')

  if (metodo === 'GET' && caminho === '/api/trilhas') {
    return responder(config, 200, listar(config.params))
  }

  const daArea = /^\/api\/areas\/([^/]+)\/trilhas$/.exec(caminho)
  if (metodo === 'GET' && daArea) {
    const areaId = decodeURIComponent(daArea[1])
    if (!AREAS.some((a) => a.id === areaId)) {
      falhar(config, 404, `Área não encontrada: ${areaId}`)
    }
    return responder(config, 200, listar({ ...config.params, areaId }))
  }

  if (metodo === 'POST' && caminho === '/api/trilhas') {
    return criar(config)
  }

  const detalhe = /^\/api\/trilhas\/([^/]+)$/.exec(caminho)
  if (metodo === 'GET' && detalhe) {
    const id = decodeURIComponent(detalhe[1])
    return responder(config, 200, detalheDe(buscarNoMock(config, id)))
  }
  if (metodo === 'PUT' && detalhe) {
    return editar(config, decodeURIComponent(detalhe[1]))
  }

  const situacao = /^\/api\/trilhas\/([^/]+)\/(inativar|ativar)$/.exec(caminho)
  if (metodo === 'PATCH' && situacao) {
    return alternarAtivo(
      config,
      decodeURIComponent(situacao[1]),
      situacao[2] === 'ativar',
    )
  }

  const atribuicoes = /^\/api\/trilhas\/([^/]+)\/atribuicoes$/.exec(caminho)
  if (metodo === 'POST' && atribuicoes) {
    return atribuir(config, decodeURIComponent(atribuicoes[1]))
  }

  const progresso = /^\/api\/trilhas\/([^/]+)\/progresso$/.exec(caminho)
  if (progresso && metodo === 'POST') {
    return iniciar(config, decodeURIComponent(progresso[1]))
  }
  if (progresso && metodo === 'PATCH') {
    return atualizar(config, decodeURIComponent(progresso[1]))
  }

  if (metodo === 'GET' && caminho === '/api/usuarios') {
    return responder(
      config,
      200,
      paginar(
        USUARIOS.map((u) => ({
          ...u,
          cargo: null,
          papel: 'COLABORADOR',
          situacao: 'ATIVO',
          dataEntrada: dataDaqui(-400),
          criadoEm: diasAtras(400),
          atualizadoEm: diasAtras(400),
        })),
        config.params,
      ),
    )
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
