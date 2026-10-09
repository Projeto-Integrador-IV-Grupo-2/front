import type {
  AtribuicaoAcompanhamento,
  ColaboradorAcompanhamento,
} from '../types/atribuicao.ts'
import type { Area } from '../types/area.ts'
import type {
  ProgressoTrilha,
  ResultadoAtribuicao,
  TrilhaDetalhe,
  TrilhaResumo,
} from '../types/trilha.ts'
import type { User } from '../types/user.ts'
import type { Pagina, Usuario as UsuarioGestao } from '../types/usuario.ts'

const TENANT_PADRAO = '11111111-1111-1111-1111-111111111111'

/** Usuário de teste. Passe só o que o caso precisa distinguir. */
export function criarUsuario(overrides: Partial<User> = {}): User {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    tenantId: TENANT_PADRAO,
    nomeCompleto: 'Ana Souza',
    email: 'ana@nexo.com',
    papel: 'COLABORADOR',
    ...overrides,
  }
}

/**
 * Usuário no formato da gestão (`UsuarioResponse` da API) — mais rico que o
 * `User` da sessão, que só carrega o necessário para autenticar.
 */
export function criarUsuarioGestao(
  overrides: Partial<UsuarioGestao> = {},
): UsuarioGestao {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    nomeCompleto: 'Ana Souza',
    email: 'ana@nexo.com',
    cargo: { id: '22222222-2222-2222-2222-222222222222', nome: 'Analista' },
    area: { id: '33333333-3333-3333-3333-333333333333', nome: 'Tecnologia' },
    papel: 'COLABORADOR',
    situacao: 'ATIVO',
    dataEntrada: '2025-02-10',
    criadoEm: '2025-02-10T12:00:00Z',
    atualizadoEm: '2025-02-10T12:00:00Z',
    ...overrides,
  }
}

/** Área de teste. Passe só o que o caso precisa distinguir. */
export function criarArea(overrides: Partial<Area> = {}): Area {
  return {
    id: '00000000-0000-0000-0000-000000000010',
    nome: 'Atendimento',
    descricao: null,
    ativo: true,
    totalPessoas: 0,
    totalConteudos: 0,
    criadoEm: '2026-01-01T00:00:00Z',
    atualizadoEm: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

/** Página do Spring com os usuários informados. */
export function criarPaginaUsuarios(
  content: UsuarioGestao[] = [criarUsuarioGestao()],
  overrides: Partial<Pagina<UsuarioGestao>['page']> = {},
): Pagina<UsuarioGestao> {
  return {
    content,
    page: {
      size: 10,
      number: 0,
      totalElements: content.length,
      totalPages: 1,
      ...overrides,
    },
  }
}

/**
 * Página de teste no formato `PagedModel` do Spring, genérica — usada pela
 * listagem de Área. `criarPaginaUsuarios`/`criarPaginaTrilhas` continuam com
 * a própria função (mesmo formato, só o tamanho padrão de página muda).
 */
export function criarPagina<T>(
  content: T[],
  overrides: Partial<Pagina<T>['page']> = {},
): Pagina<T> {
  return {
    content,
    page: {
      size: 20,
      number: 0,
      totalElements: content.length,
      totalPages: 1,
      ...overrides,
    },
  }
}

/** Progresso de trilha (`ProgressoTrilhaResponse`), por padrão em andamento. */
export function criarProgressoTrilha(
  overrides: Partial<ProgressoTrilha> = {},
): ProgressoTrilha {
  return {
    id: '55555555-5555-5555-5555-555555555555',
    trilha: { id: '44444444-4444-4444-4444-444444444444', nome: 'Onboarding' },
    status: 'EM_ANDAMENTO',
    percentual: 50,
    prazo: '2026-10-30',
    atribuidoEm: '2026-09-01T12:00:00Z',
    concluidoEm: null,
    ...overrides,
  }
}

/** Trilha como a listagem devolve (`TrilhaResumoResponse`). */
export function criarTrilhaResumo(
  overrides: Partial<TrilhaResumo> = {},
): TrilhaResumo {
  return {
    id: '44444444-4444-4444-4444-444444444444',
    nome: 'Onboarding',
    area: { id: '33333333-3333-3333-3333-333333333333', nome: 'Tecnologia' },
    ...overrides,
  }
}

/** Página do Spring com as trilhas informadas. */
export function criarPaginaTrilhas(
  content: TrilhaResumo[] = [criarTrilhaResumo()],
  overrides: Partial<Pagina<TrilhaResumo>['page']> = {},
): Pagina<TrilhaResumo> {
  return {
    content,
    page: {
      size: 12,
      number: 0,
      totalElements: content.length,
      totalPages: 1,
      ...overrides,
    },
  }
}

/** Detalhe da trilha (`TrilhaDetalheResponse`), por padrão ainda não iniciada. */
export function criarTrilhaDetalhe(
  overrides: Partial<TrilhaDetalhe> = {},
): TrilhaDetalhe {
  return {
    id: '44444444-4444-4444-4444-444444444444',
    nome: 'Onboarding',
    descricao: 'Primeiros passos na empresa.',
    area: { id: '33333333-3333-3333-3333-333333333333', nome: 'Tecnologia' },
    objetivos: 'Conhecer processos e ferramentas.',
    prazoDias: 30,
    ativo: true,
    criadoEm: '2026-08-01T12:00:00Z',
    progresso: criarProgressoTrilha({
      id: null,
      status: 'NAO_INICIADA',
      percentual: 0,
      prazo: null,
      atribuidoEm: null,
    }),
    ...overrides,
  }
}

/** Resposta da atribuição em lote (`AtribuicaoEmLoteResponse`). */
export function criarResultadoAtribuicao(
  overrides: Partial<ResultadoAtribuicao> = {},
): ResultadoAtribuicao {
  return { atribuidos: 1, ignorados: 0, ...overrides }
}

/** Linha do acompanhamento (`AtribuicaoAcompanhamentoResponse`), em andamento. */
export function criarAtribuicao(
  overrides: Partial<AtribuicaoAcompanhamento> = {},
): AtribuicaoAcompanhamento {
  return {
    id: '66666666-6666-6666-6666-666666666666',
    colaborador: {
      id: '00000000-0000-0000-0000-000000000001',
      nomeCompleto: 'Ana Souza',
      email: 'ana@nexo.com',
    },
    area: { id: '33333333-3333-3333-3333-333333333333', nome: 'Tecnologia' },
    trilha: { id: '44444444-4444-4444-4444-444444444444', nome: 'Onboarding' },
    status: 'EM_ANDAMENTO',
    percentual: 50,
    prazo: '2026-10-30',
    atribuidoEm: '2026-09-01T12:00:00Z',
    concluidoEm: null,
    ...overrides,
  }
}

/** Visão de um colaborador no acompanhamento, com totais coerentes com as trilhas. */
export function criarColaboradorAcompanhamento(
  trilhas: AtribuicaoAcompanhamento[] = [criarAtribuicao()],
): ColaboradorAcompanhamento {
  const contar = (status: AtribuicaoAcompanhamento['status']) =>
    trilhas.filter((trilha) => trilha.status === status).length
  return {
    colaborador: trilhas[0]?.colaborador ?? criarAtribuicao().colaborador,
    area: { id: '33333333-3333-3333-3333-333333333333', nome: 'Tecnologia' },
    totais: {
      total: trilhas.length,
      naoIniciadas: contar('NAO_INICIADA'),
      emAndamento: contar('EM_ANDAMENTO'),
      concluidas: contar('CONCLUIDA'),
      atrasadas: contar('ATRASADA'),
    },
    trilhas,
  }
}
