import type { ReactNode } from 'react'
import { LogoIcon } from '../Logo.tsx'
import styles from './TelaDeAcesso.module.css'

interface TelaDeAcessoProps {
  titulo: string
  subtitulo: string
  children: ReactNode
}

/**
 * Layout das telas fora do sistema: login, "esqueci minha senha" e
 * redefinição. Painel da marca à esquerda e o cartão do formulário à
 * direita — no celular, só o cartão (ver o CSS).
 */
export function TelaDeAcesso({
  titulo,
  subtitulo,
  children,
}: TelaDeAcessoProps) {
  return (
    <div className={styles.page}>
      <aside className={styles.brandPanel}>
        <LogoIcon className={styles.logo} />

        <div className={styles.brandContent}>
          <span className={styles.brandLabel}>Nexo</span>
          <h1 className={styles.brandHeadline}>
            Uma central para o conhecimento e o desenvolvimento da sua equipe.
          </h1>
          <p className={styles.brandDescription}>
            Documentos, códigos, processos, trilhas e planos de desenvolvimento
            em um só lugar, com um assistente de IA que responde qualquer dúvida
            sobre a empresa.
          </p>
        </div>

        <p className={styles.brandFooter}>© Nexo — plataforma corporativa</p>
      </aside>

      <div className={styles.formPanel}>
        <div className={styles.formCard}>
          <h2>{titulo}</h2>
          <p className={styles.subtitle}>{subtitulo}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

/** Aviso de sucesso no topo do cartão, anunciado ao leitor de tela. */
export function AvisoDeAcesso({ mensagem }: { mensagem: string | null }) {
  return (
    <div role="status" aria-live="polite" className={styles.avisoRegiao}>
      {mensagem && <p className={styles.aviso}>{mensagem}</p>}
    </div>
  )
}
