import type { TipoConteudo } from '../../types/conteudo.ts'

/**
 * Tipos oferecidos no formulário da tela de Conhecimento, com `DOCUMENTO`
 * primeiro — é ele o padrão no cadastro.
 *
 * Existe separado de `TIPOS_CONTEUDO` de propósito: o catálogo de estudo não
 * oferece documento (o material dele são arquivos anexados, que se enviam
 * aqui), e esta tela não deve herdar aquela decisão ao contrário.
 */
export const TIPOS_NO_FORMULARIO: TipoConteudo[] = [
  'DOCUMENTO',
  'TEXTO',
  'LINK',
  'VIDEO',
]
