import type { StatusProgresso } from './trilha.ts'
import type { RecursoResumo } from './usuario.ts'

/** Colaborador numa linha do acompanhamento (record `Colaborador` da API). */
export interface ColaboradorResumo {
  id: string
  nomeCompleto: string
  email: string
}

/**
 * Uma linha do acompanhamento: o andamento de um colaborador numa trilha
 * (record `AtribuicaoAcompanhamentoResponse`). `status` já é o efetivo —
 * prazo vencido e não concluída chega como `ATRASADA`.
 */
export interface AtribuicaoAcompanhamento {
  id: string
  colaborador: ColaboradorResumo
  /** Área do colaborador; nula quando ele não tem área. */
  area: RecursoResumo | null
  trilha: RecursoResumo
  status: StatusProgresso
  percentual: number
  prazo: string | null
  atribuidoEm: string | null
  concluidoEm: string | null
}

/** Quantas trilhas o colaborador tem em cada status (record `TotaisPorStatus`). */
export interface TotaisPorStatus {
  total: number
  naoIniciadas: number
  emAndamento: number
  concluidas: number
  atrasadas: number
}

/** Visão de um colaborador (`GET /api/atribuicoes/colaboradores/{usuarioId}`). */
export interface ColaboradorAcompanhamento {
  colaborador: ColaboradorResumo
  area: RecursoResumo | null
  totais: TotaisPorStatus
  trilhas: AtribuicaoAcompanhamento[]
}

/**
 * Filtros do acompanhamento (record `AtribuicaoFiltro`), todos opcionais e
 * combinados com E. Os mesmos valem para a exportação.
 */
export interface AtribuicaoFiltro {
  trilhaId?: string
  /** Área do colaborador, não da trilha. */
  areaId?: string
  usuarioId?: string
  status?: StatusProgresso | ''
}

/** Paginação e ordenação de `GET /api/atribuicoes`. `page` é zero-based. */
export interface AtribuicaoPaginacao {
  page?: number
  size?: number
  sort?: string
}

/** Arquivo baixado da API, pronto para ser salvo pelo navegador. */
export interface ArquivoExportado {
  conteudo: Blob
  nome: string
}
