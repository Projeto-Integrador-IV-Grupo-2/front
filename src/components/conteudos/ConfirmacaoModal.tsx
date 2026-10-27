import { Modal } from './Modal.tsx'
import styles from './Modal.module.css'

interface ConfirmacaoModalProps {
  titulo: string
  mensagem: string
  /** Texto do botão que confirma — diga a ação, não "OK". */
  rotuloConfirmar: string
  confirmando: boolean
  onConfirmar: () => void
  onFechar: () => void
}

/**
 * Pergunta antes de uma ação que muda o que os colaboradores enxergam
 * (publicar e despublicar). Usa a mesma moldura dos cadastros.
 */
export function ConfirmacaoModal({
  titulo,
  mensagem,
  rotuloConfirmar,
  confirmando,
  onConfirmar,
  onFechar,
}: ConfirmacaoModalProps) {
  return (
    <Modal titulo={titulo} onFechar={onFechar}>
      {() => (
        <div className={styles.form}>
          <p>{mensagem}</p>
          <div className={styles.acoes}>
            <button
              type="button"
              className={styles.cancelar}
              onClick={onFechar}
              disabled={confirmando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.salvar}
              onClick={onConfirmar}
              disabled={confirmando}
            >
              {confirmando ? 'Aguarde…' : rotuloConfirmar}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
