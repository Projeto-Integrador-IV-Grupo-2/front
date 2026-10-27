import type { ComponentType } from 'react'
import { PreviaPdf } from './PreviaPdf.tsx'
import { PreviaTexto } from './PreviaTexto.tsx'
import { SemPrevia } from './SemPrevia.tsx'
import type { PreviaProps } from './PreviaProps.ts'
import type { TipoArquivo } from '../../../types/arquivo.ts'

/**
 * Factory Method da pré-visualização: o tipo do arquivo escolhe qual prévia
 * montar. Quem usa não conhece PDF nem texto — pede a prévia do arquivo e
 * pronto, então um formato novo (um `XLSX`, por exemplo) é só mais uma
 * entrada no mapa abaixo.
 */
const POR_TIPO: Record<TipoArquivo, ComponentType<PreviaProps>> = {
  PDF: PreviaPdf,
  TXT: PreviaTexto,
  MD: PreviaTexto,
  DOCX: SemPrevia,
}

export function PreviaDeArquivo({ arquivo }: PreviaProps) {
  const Escolhida = POR_TIPO[arquivo.tipo] ?? SemPrevia
  return <Escolhida arquivo={arquivo} />
}
