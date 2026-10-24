import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ConversaAssistente } from '../components/assistente/ConversaAssistente.tsx'
import { HistoricoConversas } from '../components/assistente/HistoricoConversas.tsx'
import { IconeConversas } from '../components/assistente/icones.tsx'
import { AssistenteProvider } from '../contexts/AssistenteContext.tsx'
import { useMediaQuery } from '../hooks/useMediaQuery.ts'
import styles from './AssistentePage.module.css'

const MOBILE_QUERY = '(max-width: 900px)'
const PAINEL_ID = 'historico-conversas'

/**
 * Assistente de IA: histórico de conversas ao lado e a conversa aberta. A
 * conversa vive na URL (`/assistente/:sessaoId`), então link e F5 funcionam.
 */
export function AssistentePage() {
  const { sessaoId = null } = useParams()
  const gaveta = useMediaQuery(MOBILE_QUERY)
  const [gavetaAberta, setGavetaAberta] = useState(false)
  const alternarRef = useRef<HTMLButtonElement>(null)

  function fecharGaveta() {
    setGavetaAberta(false)
    alternarRef.current?.focus()
  }

  return (
    <AssistenteProvider sessaoId={sessaoId}>
      <div className={styles.pagina}>
        <div className={styles.cabecalho}>
          <div>
            <h1 className={styles.titulo}>Assistente de IA</h1>
            <p className={styles.hint}>
              Pergunte qualquer coisa sobre a empresa: documentos, políticas,
              códigos, sistemas, processos, pessoas — e também o seu
              desenvolvimento.
            </p>
          </div>
          {gaveta && (
            <button
              ref={alternarRef}
              type="button"
              className={styles.abrirHistorico}
              aria-expanded={gavetaAberta}
              aria-controls={PAINEL_ID}
              onClick={() => setGavetaAberta(true)}
            >
              <IconeConversas />
              Conversas
            </button>
          )}
        </div>

        <div className={styles.corpo}>
          <HistoricoConversas
            id={PAINEL_ID}
            gaveta={gaveta}
            aberto={gavetaAberta}
            onFechar={fecharGaveta}
          />
          <ConversaAssistente />
        </div>
      </div>
    </AssistenteProvider>
  )
}
