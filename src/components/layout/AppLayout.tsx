import { useRef, useState } from 'react'
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
  const [eraMobile, setEraMobile] = useState(isMobile)
  const alternarRef = useRef<HTMLButtonElement>(null)

  // Ajuste de estado durante o render (padrão recomendado pelo React, no lugar
  // de um efeito): ao sair da largura mobile o menu é esquecido, senão ele
  // reapareceria sozinho ao estreitar a janela de novo.
  if (eraMobile !== isMobile) {
    setEraMobile(isMobile)
    setIsMenuOpen(false)
  }

  // Deriva a visibilidade real do menu do breakpoint atual, em vez de
  // sincronizar estado por efeito — em desktop o menu nunca aparece.
  const showMobileMenu = isMobile && isMenuOpen

  // O menu vem da mesma regra que protege as rotas: nada aparece aqui que
  // o ProtectedRoute vá recusar depois.
  const itens = itensMenuPara(user?.papel)

  function fecharMenu() {
    if (!isMenuOpen) {
      return
    }
    setIsMenuOpen(false)
    // O menu recolhido esconde o link clicado e o foco cairia no <body>.
    alternarRef.current?.focus()
  }

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
            ref={alternarRef}
            type="button"
            className={styles.menuToggle}
            aria-expanded={showMobileMenu}
            aria-controls="primary-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="visually-hidden">
              {showMobileMenu ? 'Fechar menu' : 'Abrir menu'}
            </span>
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
                onClick={fecharMenu}
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

      {/* tabIndex -1: sem isso o atalho acima move o indicador do navegador,
          mas não o foco do teclado. */}
      <main id={CONTEUDO_ID} tabIndex={-1} className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
