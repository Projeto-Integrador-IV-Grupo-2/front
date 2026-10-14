import type { StatusConteudo, TipoConteudo } from './conteudo.ts'
import type { ProgressoTrilha } from './trilha.ts'

/** Conteúdo resumido dentro de uma etapa (record `EtapaResponse.ConteudoResumo`). */
export interface ConteudoDaEtapa {
  id: string
  titulo: string
  tipo: TipoConteudo
  status: StatusConteudo
  videoUrl: string | null
  duracaoSegundos: number | null
  miniaturaUrl: string | null
  corpo: string | null
  linkUrl: string | null
}

/**
 * Etapa da trilha (record `EtapaResponse`). `concluida` é sempre do usuário
 * autenticado — a API nunca expõe o progresso de outra pessoa aqui.
 */
export interface Etapa {
  id: string
  ordem: number
  titulo: string
  descricao: string | null
  conteudo: ConteudoDaEtapa
  concluida: boolean
}

/** Corpo de `POST` e `PUT` das etapas. Título em branco usa o do conteúdo. */
export interface EtapaRequest {
  conteudoId: string
  titulo: string | null
  descricao: string | null
}

/** Resposta de `POST /etapas/{etapaId}/concluir`: progresso já recalculado. */
export interface ConclusaoEtapa {
  etapaId: string
  progresso: ProgressoTrilha
}
