import styles from './Paginacao.module.css'

interface PaginacaoProps {
  /** Página atual, zero-based (é o que a API devolve em `page.number`). */
  pagina: number
  totalPaginas: number
  totalElementos: number
  onIrPara: (pagina: number) => void
  desabilitado: boolean
  /** Nome do item no singular e no plural (padrão: área/áreas). */
  item?: string
  itens?: string
}

/**
 * Navegação entre páginas de uma listagem. Nasceu na de áreas; outras telas
 * passam o nome do item (`item`/`itens`).
 */
export function Paginacao({
  pagina,
  totalPaginas,
  totalElementos,
  onIrPara,
  desabilitado,
  item = 'área',
  itens = 'áreas',
}: PaginacaoProps) {
  const primeira = pagina <= 0
  const ultima = pagina >= totalPaginas - 1

  return (
    <nav className={styles.paginacao} aria-label={`Paginação de ${itens}`}>
      <p className={styles.resumo}>
        Página {pagina + 1} de {Math.max(totalPaginas, 1)} — {totalElementos}{' '}
        {totalElementos === 1 ? item : itens}
      </p>
      <div className={styles.botoes}>
        <button
          type="button"
          onClick={() => onIrPara(pagina - 1)}
          disabled={primeira || desabilitado}
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onIrPara(pagina + 1)}
          disabled={ultima || desabilitado}
        >
          Próxima
        </button>
      </div>
    </nav>
  )
}
