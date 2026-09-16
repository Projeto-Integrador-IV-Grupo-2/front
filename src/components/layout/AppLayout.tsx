import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useMediaQuery } from '../../hooks/useMediaQuery.ts'
import styles from './AppLayout.module.css'

const MOBILE_QUERY = '(max-width: 640px)'

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
}

/** Layout base da área autenticada: cabeçalho responsivo + conteúdo da rota. */
export function AppLayout() {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Deriva a visibilidade real do menu do breakpoint atual, em vez de
  // sincronizar estado por efeito — em desktop o menu nunca aparece,
  // mesmo que isMenuOpen tenha ficado true de uma visita mobile anterior.
  const showMobileMenu = isMobile && isMenuOpen

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.brand}>Nexo</span>

          <button
            type="button"
            className={styles.menuToggle}
            aria-expanded={showMobileMenu}
            aria-controls="primary-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="visually-hidden">Abrir menu</span>
            <span aria-hidden="true">☰</span>
          </button>

          <nav
            id="primary-navigation"
            className={`${styles.nav} ${showMobileMenu ? styles.navOpen : ''}`}
          >
            <NavLink
              to="/dashboard"
              className={navLinkClassName}
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </NavLink>
          </nav>
        </div>
      </header>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
