import { ROTULOS_TIPO_ARQUIVO } from '../../../types/arquivo.ts'
import type { PreviaProps } from './PreviaProps.ts'
import styles from './Previa.module.css'

/**
 * Formato sem prévia no navegador (hoje, DOCX). Em vez de uma área em
 * branco, diz o que fazer: baixar o arquivo.
 */
export function SemPrevia({ arquivo }: PreviaProps) {
  return (
    <p className={styles.estado}>
      Arquivos {ROTULOS_TIPO_ARQUIVO[arquivo.tipo]} não têm pré-visualização
      aqui. Baixe o arquivo para abri-lo.
    </p>
  )
}
