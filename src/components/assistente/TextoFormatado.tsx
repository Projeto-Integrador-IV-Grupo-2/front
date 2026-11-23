import type { ReactNode } from 'react'
import styles from './TextoFormatado.module.css'

/**
 * Mostra o Markdown simples que o modelo devolve (negrito, itálico, código,
 * listas, títulos e parágrafos) como elementos React — nunca como HTML cru,
 * então nada do texto da resposta vira marcação executável.
 */
export function TextoFormatado({ texto }: { texto: string }) {
  return <div className={styles.texto}>{blocos(texto)}</div>
}

type Bloco =
  | { tipo: 'paragrafo'; linhas: string[] }
  | { tipo: 'lista'; ordenada: boolean; itens: string[] }
  | { tipo: 'titulo'; nivel: number; texto: string }

const ITEM_NAO_ORDENADO = /^\s*[-*•]\s+(.*)$/
const ITEM_ORDENADO = /^\s*\d+[.)]\s+(.*)$/
const TITULO = /^\s*(#{1,4})\s+(.*)$/

function separar(texto: string): Bloco[] {
  const resultado: Bloco[] = []
  let atual: Bloco | null = null
  const fechar = () => {
    if (atual) resultado.push(atual)
    atual = null
  }

  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (linha.trim() === '') {
      fechar()
      continue
    }
    const titulo = TITULO.exec(linha)
    if (titulo) {
      fechar()
      resultado.push({
        tipo: 'titulo',
        nivel: titulo[1].length,
        texto: titulo[2],
      })
      continue
    }
    const naoOrdenado = ITEM_NAO_ORDENADO.exec(linha)
    const ordenado = naoOrdenado ? null : ITEM_ORDENADO.exec(linha)
    const item = naoOrdenado ?? ordenado
    if (item) {
      const ehOrdenada = ordenado !== null
      const blocoAtual = atual as Bloco | null
      if (blocoAtual?.tipo === 'lista' && blocoAtual.ordenada === ehOrdenada) {
        blocoAtual.itens.push(item[1])
      } else {
        fechar()
        atual = { tipo: 'lista', ordenada: ehOrdenada, itens: [item[1]] }
      }
      continue
    }
    const blocoAtual = atual as Bloco | null
    if (blocoAtual?.tipo === 'lista' && /^\s{2,}/.test(linha)) {
      // Continuação de um item de lista (linha recuada).
      const ultimo = blocoAtual.itens.length - 1
      blocoAtual.itens[ultimo] = `${blocoAtual.itens[ultimo]} ${linha.trim()}`
      continue
    }
    if (blocoAtual?.tipo === 'paragrafo') {
      blocoAtual.linhas.push(linha)
    } else {
      fechar()
      atual = { tipo: 'paragrafo', linhas: [linha] }
    }
  }
  fechar()
  return resultado
}

function blocos(texto: string): ReactNode[] {
  return separar(texto).map((bloco, indice) => {
    if (bloco.tipo === 'titulo') {
      return (
        <p key={indice} className={styles.titulo}>
          {emLinha(bloco.texto)}
        </p>
      )
    }
    if (bloco.tipo === 'lista') {
      const Lista = bloco.ordenada ? 'ol' : 'ul'
      return (
        <Lista key={indice}>
          {bloco.itens.map((item, i) => (
            <li key={i}>{emLinha(item)}</li>
          ))}
        </Lista>
      )
    }
    return (
      <p key={indice}>
        {bloco.linhas.map((linha, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {emLinha(linha)}
          </span>
        ))}
      </p>
    )
  })
}

const MARCAS = /(\*\*.+?\*\*|__.+?__|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g

/** Negrito, itálico e código dentro de uma linha. */
function emLinha(texto: string): ReactNode[] {
  return texto.split(MARCAS).map((parte, i) => {
    if (!parte) return null
    if (
      (parte.startsWith('**') && parte.endsWith('**')) ||
      (parte.startsWith('__') && parte.endsWith('__'))
    ) {
      return <strong key={i}>{emLinha(parte.slice(2, -2))}</strong>
    }
    if (parte.startsWith('`') && parte.endsWith('`')) {
      return <code key={i}>{parte.slice(1, -1)}</code>
    }
    if (
      parte.length > 2 &&
      ((parte.startsWith('*') && parte.endsWith('*')) ||
        (parte.startsWith('_') && parte.endsWith('_')))
    ) {
      return <em key={i}>{parte.slice(1, -1)}</em>
    }
    return parte
  })
}
