import type {
  ConteudoFiltro,
  StatusConteudo,
  TipoConteudo,
} from '../../types/conteudo.ts'

/**
 * Filtros da tela de Conhecimento. O título é o texto já adiado (a busca não
 * sai a cada tecla); os outros campos valem assim que mudam.
 */
export interface FiltroConhecimento {
  titulo: string
  categoriaId: string
  areaId: string
  tipo: TipoConteudo | ''
  status: StatusConteudo | ''
}

/**
 * Factory Method do filtro inicial: a tela abre nos documentos (tipo
 * `DOCUMENTO`), sem outros filtros. "Limpar filtros" volta para cá.
 */
export function criarFiltroInicial(): FiltroConhecimento {
  return {
    titulo: '',
    categoriaId: '',
    areaId: '',
    tipo: 'DOCUMENTO',
    status: '',
  }
}

/** Tipos do filtro, com o documento primeiro (é o foco da tela). */
export const TIPOS_NO_FILTRO: TipoConteudo[] = [
  'DOCUMENTO',
  'VIDEO',
  'TEXTO',
  'LINK',
]

/**
 * Converte para o filtro da API. Quem não pode filtrar por status nunca o
 * envia — para o colaborador a API já força `PUBLICADO`.
 */
export function paraFiltroDaApi(
  filtro: FiltroConhecimento,
  podeFiltrarStatus: boolean,
): ConteudoFiltro {
  return {
    titulo: filtro.titulo,
    categoriaId: filtro.categoriaId,
    areaId: filtro.areaId,
    tipo: filtro.tipo,
    status: podeFiltrarStatus ? filtro.status : '',
  }
}

/** Se algum filtro difere do inicial — para mostrar "Limpar filtros". */
export function temFiltroAlterado(filtro: FiltroConhecimento): boolean {
  const inicial = criarFiltroInicial()
  return (Object.keys(inicial) as Array<keyof FiltroConhecimento>).some(
    (campo) => filtro[campo] !== inicial[campo],
  )
}
