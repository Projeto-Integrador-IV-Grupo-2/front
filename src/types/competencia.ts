/** Tipo da competência — espelha o enum `TipoCompetencia` da API. */
export type TipoCompetencia = 'TECNICA' | 'COMPORTAMENTAL'

/** Competência do catálogo do tenant (record `CompetenciaResponse`). */
export interface Competencia {
  id: string
  nome: string
  descricao: string | null
  tipo: TipoCompetencia
  ativo: boolean
}

/** Corpo de `POST /api/competencias` (record `CompetenciaRequest`). */
export interface CompetenciaRequest {
  nome: string
  descricao: string | null
  tipo: TipoCompetencia
}

export const ROTULOS_TIPO_COMPETENCIA: Record<TipoCompetencia, string> = {
  TECNICA: 'Técnica',
  COMPORTAMENTAL: 'Comportamental',
}
