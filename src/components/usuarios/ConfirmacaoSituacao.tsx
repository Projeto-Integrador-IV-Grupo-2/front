import { useEffect, useId, useRef } from 'react'
import { type Usuario } from '../../types/usuario.ts'
import styles from './ConfirmacaoSituacao.module.css'

interface ConfirmacaoSituacaoProps {
  usuario: Usuario
  processando: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

/**
 * Confirmação da mudança de situação. É um diálogo da própria aplicação, e não
 * `window.confirm`, porque o nativo trava a thread, não é estilizável e não dá
 * para testar sem mock global.
 */
export function ConfirmacaoSituacao({
  usuario,
  processando,
  onConfirmar,
  onCancelar,
}: ConfirmacaoSituacaoProps) {
  const idBase = useId()
  const confirmar = useRef<HTMLButtonElement>(null)
  const desativando = usuario.situacao === 'ATIVO'

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
          {desativando ? 'Desativar usuário' : 'Reativar usuário'}
        </h2>
        <p id={`${idBase}-texto`} className={styles.texto}>
          {desativando
            ? `${usuario.nomeCompleto} perderá o acesso ao sistema até ser reativado.`
            : `${usuario.nomeCompleto} voltará a ter acesso ao sistema.`}
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
            className={desativando ? styles.perigo : styles.confirmar}
            onClick={onConfirmar}
            disabled={processando}
          >
            {processando ? 'Aguarde…' : desativando ? 'Desativar' : 'Reativar'}
          </button>
        </div>
      </div>
    </div>
  )
}
