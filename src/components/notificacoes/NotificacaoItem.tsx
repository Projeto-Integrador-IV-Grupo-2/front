import type { Notificacao } from '../../types/notificacao.ts'
import { tempoRelativo } from '../../utils/tempoRelativo.ts'
import { apresentacaoDe } from './apresentacaoNotificacao.tsx'
import styles from './NotificacaoItem.module.css'

interface NotificacaoItemProps {
  notificacao: Notificacao
  /** Já considera o que foi marcado em outra tela (ver NotificacoesContext). */
  lida: boolean
  onAbrir: (notificacao: Notificacao) => void
}

/**
 * Uma notificação clicável, igual no painel do sino e na página. A não lida
 * tem fundo e ponto de destaque; para leitores de tela, o estado e o tipo
 * abrem o nome do botão ("Não lida, Prazo próximo: …").
 */
export function NotificacaoItem({
  notificacao,
  lida,
  onAbrir,
}: NotificacaoItemProps) {
  const { icone, rotulo, tom } = apresentacaoDe(notificacao.tipo)
  return (
    <button
      type="button"
      className={`${styles.item} ${lida ? '' : styles.naoLida}`}
      onClick={() => onAbrir(notificacao)}
    >
      <span className={styles.icone} data-tom={tom}>
        {icone}
      </span>
      <span className={styles.corpo}>
        <span className="visually-hidden">
          {lida ? 'Lida' : 'Não lida'}, {rotulo}:{' '}
        </span>
        <span className={styles.titulo}>{notificacao.titulo}</span>
        <span className={styles.mensagem}>{notificacao.mensagem}</span>
        <time className={styles.quando} dateTime={notificacao.criadaEm}>
          {tempoRelativo(notificacao.criadaEm)}
        </time>
      </span>
      {!lida && <span className={styles.ponto} aria-hidden="true" />}
    </button>
  )
}
