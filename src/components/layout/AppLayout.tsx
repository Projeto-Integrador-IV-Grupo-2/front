import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.ts'
import { useMediaQuery } from '../../hooks/useMediaQuery.ts'
import { ROTAS } from '../../routes/paths.ts'
import { itensMenuPara } from '../../routes/permissions.ts'
import styles from './AppLayout.module.css'

const MOBILE_QUERY = '(max-width: 640px)'
const CONTEUDO_ID = 'conteudo-principal'

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
}

/** Layout base da área autenticada: cabeçalho responsivo + conteúdo da rota. */
export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Deriva a visibilidade real do menu do breakpoint atual, em vez de
  // sincronizar estado por efeito — em desktop o menu nunca aparece,
  // mesmo que isMenuOpen tenha ficado true de uma visita mobile anterior.
  const showMobileMenu = isMobile && isMenuOpen

  // O menu vem da mesma regra que protege as rotas: nada aparece aqui que
  // o ProtectedRoute vá recusar depois.
  const itens = itensMenuPara(user?.papel)

  function handleLogout() {
    logout()
    navigate(ROTAS.login, { replace: true })
  }

  return (
    <div className={styles.layout}>
      {/* Com o menu crescendo por perfil, navegar por teclado custaria vários
          Tabs até o conteúdo. */}
      <a href={`#${CONTEUDO_ID}`} className={styles.skipLink}>
        Pular para o conteúdo
      </a>

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
            {itens.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navLinkClassName}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.rotulo}
              </NavLink>
            ))}

            <button
              type="button"
              className={styles.sair}
              onClick={handleLogout}
            >
              Sair
            </button>
          </nav>
        </div>
      </header>

      <main id={CONTEUDO_ID} className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
