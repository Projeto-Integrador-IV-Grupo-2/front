import styles from './DashboardPage.module.css'

/** Placeholder da área autenticada. */
export function DashboardPage() {
  return (
    <div className={styles.page}>
      <h1>Dashboard</h1>
      <p className={styles.hint}>
        Área autenticada. Os módulos de gestão administrativa serão adicionados
        aqui.
      </p>
    </div>
  )
}
