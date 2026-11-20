import { PdisEquipe } from '../components/pdi/PdisEquipe.tsx'
import styles from './PdiPage.module.css'

/**
 * PDI (`/pdi`), com item próprio no menu lateral. É tela de gestão (ADMIN e
 * GESTOR, a rota barra o colaborador): a lista dos PDIs da equipe, de onde se
 * cria um PDI e se abre o editor de cada um.
 */
export function PdiPage() {
  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.titulo}>PDI</h1>
        <p className={styles.hint}>
          Plano de Desenvolvimento Individual: competências a desenvolver e as
          trilhas ligadas a cada uma.
        </p>
      </header>

      <div className={styles.painel}>
        <PdisEquipe />
      </div>
    </div>
  )
}
