import type { StatusProgresso } from './trilha.ts'
import type { TipoInteracao } from './historico.ts'

/** Contagens efetivas por status, iguais às retornadas pela API. */
export interface ResumoStatusDashboard {
  total: number
  naoIniciadas: number
  emAndamento: number
  concluidas: number
  atrasadas: number
}

/** Atribuição pessoal com prazo dentro dos próximos sete dias. */
export interface ProximoPrazoDashboard {
  atribuicaoId: string
  trilhaId: string
  trilhaNome: string
  prazo: string
  status: StatusProgresso
  percentual: number
}

export type TipoInteracaoHistorico = TipoInteracao

/** Registro público do histórico, conforme DTO da API. */
export interface HistoricoInteracaoDashboard {
  id: string
  tipo: TipoInteracaoHistorico
  detalhes: Record<string, unknown>
  usuario: {
    id: string
    nomeCompleto: string
    email: string
  }
  criadoEm: string
}

/** Resposta de GET /api/dashboard/colaborador. */
export interface DashboardColaboradorResponse {
  trilhasPorStatus: ResumoStatusDashboard
  proximosPrazos: ProximoPrazoDashboard[]
  percentualMedio: number
  ultimasAtividades: HistoricoInteracaoDashboard[]
}

/** Área do colaborador com mais atribuições atrasadas. */
export interface AreaComMaisAtrasoDashboard {
  areaId: string
  areaNome: string
  atribuicoesAtrasadas: number
}

/** Trilha ordenada pela quantidade de eventos reais de início. */
export interface TrilhaMaisIniciadaDashboard {
  trilhaId: string
  trilhaNome: string
  totalIniciadas: number
}

/** Resposta de GET /api/dashboard/gestao. */
export interface DashboardGestaoResponse {
  trilhasAtivas: number
  atribuicoesPorStatus: ResumoStatusDashboard
  taxaConclusao: number
  areasComMaisAtraso: AreaComMaisAtrasoDashboard[]
  trilhasMaisIniciadas: TrilhaMaisIniciadaDashboard[]
}
