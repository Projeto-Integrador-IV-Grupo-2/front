import styles from './UsuariosPage.module.css'

/**
 * Área administrativa de gestão de usuários.
 *
 * Esta issue entrega a rota protegida; a listagem, os filtros e o cadastro
 * entram no card seguinte.
 */
export function UsuariosPage() {
  return (
    <div className={styles.page}>
      <h1>Usuários</h1>
      <p className={styles.hint}>
        A listagem, os filtros e o cadastro de usuários entram no próximo card.
      </p>
    </div>
  )
}
