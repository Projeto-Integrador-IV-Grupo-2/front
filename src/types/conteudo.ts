import type { RecursoResumo } from './usuario.ts'

/** Tipo do conteúdo — espelha o enum `TipoConteudo` da API. */
export type TipoConteudo = 'VIDEO' | 'TEXTO' | 'LINK'

/** Situação editorial — espelha o enum `StatusConteudo` da API. */
export type StatusConteudo = 'RASCUNHO' | 'PUBLICADO'

/** Categoria no formato do record `CategoriaResponse`. */
export interface Categoria {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

/** Corpo de `POST /api/categorias` e `PUT /api/categorias/{id}`. */
export interface CategoriaRequest {
  nome: string
  descricao: string | null
}

/**
 * Conteúdo no formato do record `ConteudoResponse`. `duracaoSegundos` e
 * `miniaturaUrl` são preenchidos pela API a partir do Vimeo — nunca enviados
 * pelo front.
 */
export interface Conteudo {
  id: string
  titulo: string
  descricao: string | null
  tipo: TipoConteudo
  status: StatusConteudo
  categoria: RecursoResumo | null
  area: RecursoResumo | null
  videoUrl: string | null
  duracaoSegundos: number | null
  miniaturaUrl: string | null
  corpo: string | null
  linkUrl: string | null
  criadoEm: string
  atualizadoEm: string
  publicadoEm: string | null
}

/**
 * Corpo de `POST /api/conteudos` e `PUT /api/conteudos/{id}`. Só o campo do
 * tipo escolhido importa: `videoUrl` para VIDEO, `corpo` para TEXTO e
 * `linkUrl` para LINK.
 */
export interface ConteudoRequest {
  titulo: string
  descricao: string | null
  tipo: TipoConteudo
  categoriaId: string | null
  areaId: string | null
  videoUrl: string | null
  corpo: string | null
  linkUrl: string | null
}

/** Filtros de `GET /api/conteudos`, todos opcionais. */
export interface ConteudoFiltro {
  titulo?: string
  categoriaId?: string
  areaId?: string
  tipo?: TipoConteudo | ''
  /** Para colaborador a API força `PUBLICADO`, seja qual for o valor enviado. */
  status?: StatusConteudo | ''
}

export const TIPOS_CONTEUDO: TipoConteudo[] = ['VIDEO', 'TEXTO', 'LINK']

export const ROTULOS_TIPO_CONTEUDO: Record<TipoConteudo, string> = {
  VIDEO: 'Vídeo',
  TEXTO: 'Texto',
  LINK: 'Link',
}

export const ROTULOS_STATUS_CONTEUDO: Record<StatusConteudo, string> = {
  RASCUNHO: 'Rascunho',
  PUBLICADO: 'Publicado',
}
