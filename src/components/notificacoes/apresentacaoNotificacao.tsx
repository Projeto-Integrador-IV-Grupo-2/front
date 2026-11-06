import type { ReactNode } from 'react'
import type { Notificacao, TipoNotificacao } from '../../types/notificacao.ts'
import { Icone } from './IconeNotificacao.tsx'

/** Cor do ícone: a mesma escala de alertas do resto da aplicação. */
export type TomNotificacao = 'info' | 'alerta' | 'perigo' | 'sucesso' | 'neutro'

export interface ApresentacaoNotificacao {
  icone: ReactNode
  /** Nome do tipo para leitores de tela ("Prazo próximo"). */
  rotulo: string
  tom: TomNotificacao
}

const APRESENTACOES: Record<TipoNotificacao, () => ApresentacaoNotificacao> = {
  TRILHA_ATRIBUIDA: () => ({
    rotulo: 'Trilha atribuída',
    tom: 'info',
    icone: (
      <Icone>
        <circle cx="6" cy="5" r="2" />
        <circle cx="6" cy="19" r="2" />
        <circle cx="18" cy="12" r="2" />
        <path d="M6 7v10M7.8 6l8.4 5M7.8 18l8.4-5" />
      </Icone>
    ),
  }),
  PRAZO_PROXIMO: () => ({
    rotulo: 'Prazo próximo',
    tom: 'alerta',
    icone: (
      <Icone>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </Icone>
    ),
  }),
  PRAZO_VENCIDO: () => ({
    rotulo: 'Prazo vencido',
    tom: 'perigo',
    icone: (
      <Icone>
        <path d="M12 3.5l9.5 16.5h-19z" />
        <path d="M12 10v4.5M12 17.5v.01" />
      </Icone>
    ),
  }),
  TRILHA_CONCLUIDA: () => ({
    rotulo: 'Trilha concluída',
    tom: 'sucesso',
    icone: (
      <Icone>
        <path d="M20 6L9 17l-5-5" />
      </Icone>
    ),
  }),
  CONTEUDO_PUBLICADO: () => ({
    rotulo: 'Conteúdo publicado',
    tom: 'info',
    icone: (
      <Icone>
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </Icone>
    ),
  }),
  TRILHA_INATIVADA: () => ({
    rotulo: 'Trilha inativada',
    tom: 'neutro',
    icone: (
      <Icone>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M6 18L18 6" />
      </Icone>
    ),
  }),
}

function generica(): ApresentacaoNotificacao {
  return {
    rotulo: 'Notificação',
    tom: 'neutro',
    icone: (
      <Icone>
        <path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" />
        <path d="M10 19a2 2 0 004 0" />
      </Icone>
    ),
  }
}

function ehTipoConhecido(tipo: string): tipo is TipoNotificacao {
  return Object.prototype.hasOwnProperty.call(APRESENTACOES, tipo)
}

/**
 * Factory Method: escolhe o ícone, o rótulo e o tom de cada tipo de
 * notificação. Quem desenha (painel do sino e página) não conhece os tipos.
 * Tipo que a API passar a mandar antes do front saber dele cai no genérico.
 */
export function apresentacaoDe(
  tipo: Notificacao['tipo'],
): ApresentacaoNotificacao {
  return ehTipoConhecido(tipo) ? APRESENTACOES[tipo]() : generica()
}
