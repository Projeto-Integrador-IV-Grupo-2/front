import type {
  AtribuicaoAcompanhamento,
  ColaboradorAcompanhamento,
} from '../types/atribuicao.ts'
import type { Area } from '../types/area.ts'
import type { Arquivo } from '../types/arquivo.ts'
import type { Categoria, Conteudo } from '../types/conteudo.ts'
import type { Etapa } from '../types/etapa.ts'
import type { Competencia } from '../types/competencia.ts'
import type { PdiAcao, PdiDetalhe, PdiItem, PdiResumo } from '../types/pdi.ts'
import type {
  ProgressoTrilha,
  ResultadoAtribuicao,
  TrilhaDetalhe,
  TrilhaResumo,
} from '../types/trilha.ts'
import type { User } from '../types/user.ts'
import type {
  DashboardColaboradorResponse,
  DashboardGestaoResponse,
} from '../types/dashboard.ts'
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
  return {
    atribuidos: 1,
    ignorados: 0,
    usuarioIds: ['00000000-0000-0000-0000-000000000001'],
    ...overrides,
  }
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

/** Categoria de conteúdo (`CategoriaResponse`). */
export function criarCategoria(overrides: Partial<Categoria> = {}): Categoria {
  return {
    id: '66666666-6666-6666-6666-666666666666',
    nome: 'Onboarding',
    descricao: null,
    ativo: true,
    criadoEm: '2026-09-01T12:00:00Z',
    atualizadoEm: '2026-09-01T12:00:00Z',
    ...overrides,
  }
}

/** Competência do catálogo (`CompetenciaResponse`). */
export function criarCompetencia(
  overrides: Partial<Competencia> = {},
): Competencia {
  return {
    id: '66666666-6666-6666-6666-666666666666',
    nome: 'Comunicação',
    descricao: null,
    tipo: 'COMPORTAMENTAL',
    ativo: true,
    ...overrides,
  }
}

/** Conteúdo de vídeo publicado (`ConteudoResponse`). */
export function criarConteudo(overrides: Partial<Conteudo> = {}): Conteudo {
  return {
    id: '77777777-7777-7777-7777-777777777777',
    titulo: 'Boas-vindas',
    descricao: null,
    tipo: 'VIDEO',
    status: 'PUBLICADO',
    categoria: null,
    area: null,
    videoUrl: 'https://vimeo.com/22439234',
    duracaoSegundos: 185,
    miniaturaUrl: 'https://i.vimeocdn.com/video/1.jpg',
    corpo: null,
    linkUrl: null,
    criadoEm: '2026-09-01T12:00:00Z',
    atualizadoEm: '2026-09-01T12:00:00Z',
    publicadoEm: '2026-09-02T12:00:00Z',
    ...overrides,
  }
}

/** Arquivo PDF anexado ao conteúdo "Boas-vindas". */
export function criarArquivo(overrides: Partial<Arquivo> = {}): Arquivo {
  return {
    id: '88888888-8888-8888-8888-888888888888',
    conteudoId: '77777777-7777-7777-7777-777777777777',
    nomeOriginal: 'politica-de-ferias.pdf',
    tipo: 'PDF',
    mimeType: 'application/pdf',
    tamanhoBytes: 2048,
    criadoEm: '2026-09-01T12:00:00Z',
    ...overrides,
  }
}

/** Ação TRILHA do PDI, ligada à trilha "Onboarding" e ainda pendente. */
export function criarPdiAcao(overrides: Partial<PdiAcao> = {}): PdiAcao {
  return {
    id: '77777777-7777-7777-7777-777777777777',
    tipo: 'TRILHA',
    descricao: null,
    trilha: { id: '44444444-4444-4444-4444-444444444444', nome: 'Onboarding' },
    prazo: '2026-11-30',
    status: 'PENDENTE',
    concluidoEm: null,
    progressoTrilha: criarProgressoTrilha({
      status: 'NAO_INICIADA',
      percentual: 0,
      prazo: '2026-11-30',
    }),
    ...overrides,
  }
}

/** Etapa de trilha (`EtapaResponse`); por padrão, de texto e não concluída. */
export function criarEtapa(overrides: Partial<Etapa> = {}): Etapa {
  return {
    id: '88888888-8888-8888-8888-888888888888',
    ordem: 1,
    titulo: 'Leia o manual',
    descricao: null,
    conteudo: {
      id: '77777777-7777-7777-7777-777777777777',
      titulo: 'Manual',
      tipo: 'TEXTO',
      status: 'PUBLICADO',
      videoUrl: null,
      duracaoSegundos: null,
      miniaturaUrl: null,
      corpo: 'Conteúdo do manual.',
      linkUrl: null,
    },
    concluida: false,
    ...overrides,
  }
}

/** Competência dentro do PDI (`PdiItemResponse`), com uma trilha ligada. */
export function criarPdiItem(overrides: Partial<PdiItem> = {}): PdiItem {
  return {
    id: '88888888-8888-8888-8888-888888888888',
    competencia: {
      id: '66666666-6666-6666-6666-666666666666',
      nome: 'Comunicação',
      tipo: 'COMPORTAMENTAL',
    },
    nivelAtual: 2,
    nivelAlvo: 4,
    observacao: 'Apresentar com mais segurança.',
    acoes: [criarPdiAcao()],
    ...overrides,
  }
}

/** Linha da listagem de PDIs (`PdiResumoResponse`). */
export function criarPdiResumo(overrides: Partial<PdiResumo> = {}): PdiResumo {
  return {
    id: '99999999-9999-9999-9999-999999999999',
    colaborador: {
      id: '00000000-0000-0000-0000-000000000001',
      nomeCompleto: 'Ana Souza',
    },
    gestor: {
      id: '00000000-0000-0000-0000-000000000002',
      nomeCompleto: 'Bruno Lima',
    },
    ciclo: '2026',
    inicio: '2026-01-01',
    fim: '2026-12-31',
    status: 'ATIVO',
    percentual: 0,
    totalAcoes: 1,
    acoesConcluidas: 0,
    criadoEm: '2026-01-05T12:00:00Z',
    ...overrides,
  }
}

/** PDI completo (`PdiDetalheResponse`), por padrão com uma competência. */
export function criarPdiDetalhe(
  overrides: Partial<PdiDetalhe> = {},
): PdiDetalhe {
  return {
    ...criarPdiResumo(),
    itens: [criarPdiItem()],
    ...overrides,
  }
}

/** Resposta da API para o dashboard pessoal do colaborador. */
export function criarDashboardColaborador(
  overrides: Partial<DashboardColaboradorResponse> = {},
): DashboardColaboradorResponse {
  return {
    trilhasPorStatus: {
      total: 3,
      naoIniciadas: 1,
      emAndamento: 1,
      concluidas: 1,
      atrasadas: 0,
    },
    proximosPrazos: [
      {
        atribuicaoId: '77777777-7777-7777-7777-777777777777',
        trilhaId: '44444444-4444-4444-4444-444444444444',
        trilhaNome: 'Onboarding',
        prazo: '2026-10-22',
        status: 'EM_ANDAMENTO',
        percentual: 50,
      },
    ],
    percentualMedio: 66.67,
    ultimasAtividades: [
      {
        id: '88888888-8888-8888-8888-888888888888',
        tipo: 'TRILHA_INICIADA',
        detalhes: {
          trilhaId: '44444444-4444-4444-4444-444444444444',
          trilhaNome: 'Onboarding',
          origem: 'progresso alterado para EM_ANDAMENTO',
        },
        usuario: {
          id: '00000000-0000-0000-0000-000000000001',
          nomeCompleto: 'Ana Souza',
          email: 'ana@nexo.com',
        },
        criadoEm: '2026-10-19T14:30:00Z',
      },
    ],
    ...overrides,
  }
}

/** Resposta da API para o dashboard de gestão. */
export function criarDashboardGestao(
  overrides: Partial<DashboardGestaoResponse> = {},
): DashboardGestaoResponse {
  return {
    trilhasAtivas: 12,
    atribuicoesPorStatus: {
      total: 40,
      naoIniciadas: 8,
      emAndamento: 14,
      concluidas: 12,
      atrasadas: 6,
    },
    taxaConclusao: 30,
    areasComMaisAtraso: [
      {
        areaId: '33333333-3333-3333-3333-333333333333',
        areaNome: 'Tecnologia',
        atribuicoesAtrasadas: 4,
      },
    ],
    trilhasMaisIniciadas: [
      {
        trilhaId: '44444444-4444-4444-4444-444444444444',
        trilhaNome: 'Onboarding',
        totalIniciadas: 18,
      },
    ],
    ...overrides,
  }
}
