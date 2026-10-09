import { useEffect, useId, useRef } from 'react'
import type { TrilhaDetalhe } from '../../types/trilha.ts'
import styles from './ConfirmacaoSituacaoTrilha.module.css'

interface ConfirmacaoSituacaoTrilhaProps {
  trilha: TrilhaDetalhe
  processando: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

/**
 * Confirmação de inativar ou reativar uma trilha. É um diálogo da própria
 * aplicação, e não `window.confirm`, pelo mesmo motivo da confirmação de
 * usuário: o nativo trava a thread, não é estilizável e não dá para testar
 * sem mock global.
 */
export function ConfirmacaoSituacaoTrilha({
  trilha,
  processando,
  onConfirmar,
  onCancelar,
}: ConfirmacaoSituacaoTrilhaProps) {
  const idBase = useId()
  const confirmar = useRef<HTMLButtonElement>(null)
  const inativando = trilha.ativo

  useEffect(() => {
    confirmar.current?.focus()
  }, [])

  // Esc fecha: é o que se espera de um diálogo, e evita prender quem abriu por engano.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        onCancelar()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [onCancelar])

  return (
    <div className={styles.fundo}>
      <div
        className={styles.caixa}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${idBase}-titulo`}
        aria-describedby={`${idBase}-texto`}
      >
        <h2 id={`${idBase}-titulo`} className={styles.titulo}>
          {inativando ? 'Inativar trilha' : 'Reativar trilha'}
        </h2>
        <p id={`${idBase}-texto`} className={styles.texto}>
          {inativando
            ? `“${trilha.nome}” sai da listagem dos colaboradores e não pode mais ser atribuída. Quem já a recebeu mantém o progresso.`
            : `“${trilha.nome}” volta a aparecer na listagem e pode ser atribuída de novo.`}
        </p>
        <div className={styles.acoes}>
          <button
            type="button"
            className={styles.cancelar}
            onClick={onCancelar}
            disabled={processando}
          >
            Cancelar
          </button>
          <button
            type="button"
            ref={confirmar}
            className={inativando ? styles.perigo : styles.confirmar}
            onClick={onConfirmar}
            disabled={processando}
          >
            {processando ? 'Aguarde…' : inativando ? 'Inativar' : 'Reativar'}
          </button>
        </div>
      </div>
    </div>
  )
}
