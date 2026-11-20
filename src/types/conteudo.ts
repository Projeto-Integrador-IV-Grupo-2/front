import type { RecursoResumo } from './usuario.ts'

/**
 * Tipo do conteúdo — espelha o enum `TipoConteudo` da API. `DOCUMENTO` é o
 * documento da tela de Conhecimento, com o material em arquivos anexados
 * (back #54).
 */
export type TipoConteudo = 'VIDEO' | 'TEXTO' | 'LINK' | 'DOCUMENTO'

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
 * Catálogos separados: `TRILHA` é o material das etapas das trilhas (tela
 * "Conteúdos de trilha"); `CONHECIMENTO` é o acervo consultado pela IA (tela
 * "Conhecimento"). Um não aparece na tela do outro.
 */
export type CatalogoConteudo = 'TRILHA' | 'CONHECIMENTO'

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
  /** Visível só para a gestão (ex.: salários): o colaborador não o enxerga. */
  apenasAdmin: boolean
  catalogo: CatalogoConteudo
}

/**
 * Corpo de `POST /api/conteudos` e `PUT /api/conteudos/{id}`. Só o campo do
 * tipo escolhido importa: `videoUrl` para VIDEO, `corpo` para TEXTO e
 * `linkUrl` para LINK. DOCUMENTO não tem campo próprio — o material dele são
 * os arquivos anexados depois de salvar.
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
  /** Só a gestão enxerga. Ausente vale `false`. */
  apenasAdmin?: boolean
  /** Só vale no cadastro (padrão TRILHA); a edição mantém o de origem. */
  catalogo?: CatalogoConteudo
}

/** Filtros de `GET /api/conteudos`, todos opcionais. */
export interface ConteudoFiltro {
  titulo?: string
  categoriaId?: string
  areaId?: string
  tipo?: TipoConteudo | ''
  catalogo?: CatalogoConteudo
  /** Para colaborador a API força `PUBLICADO`, seja qual for o valor enviado. */
  status?: StatusConteudo | ''
}

/**
 * Tipos oferecidos no cadastro de conteúdos de estudo. `DOCUMENTO` fica fora:
 * ele é cadastrado pela tela de Conhecimento, com upload de arquivo.
 */
export const TIPOS_CONTEUDO: TipoConteudo[] = ['VIDEO', 'TEXTO', 'LINK']

export const ROTULOS_TIPO_CONTEUDO: Record<TipoConteudo, string> = {
  VIDEO: 'Vídeo',
  TEXTO: 'Texto',
  LINK: 'Link',
  DOCUMENTO: 'Documento',
}

export const ROTULOS_STATUS_CONTEUDO: Record<StatusConteudo, string> = {
  RASCUNHO: 'Rascunho',
  PUBLICADO: 'Publicado',
}
