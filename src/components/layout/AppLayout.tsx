import { useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogoIcon } from '../Logo.tsx'
import { useAuth } from '../../hooks/useAuth.ts'
import { useMediaQuery } from '../../hooks/useMediaQuery.ts'
import { useTema } from '../../hooks/useTema.ts'
import { ROTAS } from '../../routes/paths.ts'
import { itensMenuPara } from '../../routes/permissions.ts'
import type { UserRole } from '../../types/user.ts'
import styles from './AppLayout.module.css'

const MOBILE_QUERY = '(max-width: 900px)'
const CONTEUDO_ID = 'conteudo-principal'

const ROTULO_PERFIL: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  COLABORADOR: 'Colaborador',
}

const ICONE_POR_ROTA: Record<string, ReactNode> = {
  [ROTAS.dashboard]: <GridIcon />,
  [ROTAS.trilhas]: <TrilhasIcon />,
  [ROTAS.usuarios]: <PeopleIcon />,
  [ROTAS.areas]: <LayersIcon />,
  [ROTAS.acompanhamento]: <ChartIcon />,
  [ROTAS.conhecimento]: <BookIcon />,
  [ROTAS.assistente]: <SparkleIcon />,
  [ROTAS.historico]: <ClockIcon />,
}

/**
 * Itens do menu do protótipo que ainda não têm tela própria — outros cards.
 * Aparecem no menu (pedido explícito), mas sem link: nada aqui simula uma
 * funcionalidade que ainda não existe. "Áreas", "Conhecimento", "Assistente" e
 * "Histórico" saíram daqui — já têm tela; "Pessoas" também, por ser a mesma
 * coisa que "Usuários".
 */
const ITENS_EM_BREVE: Array<{ rotulo: string; icone: ReactNode }> = []

function iniciais(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
}

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
}

/** Layout base da área autenticada: menu lateral + barra superior + conteúdo da rota. */
export function AppLayout() {
  const { user, logout } = useAuth()
  const { tema, alternar: alternarTema } = useTema()
  const navigate = useNavigate()
  const location = useLocation()
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
  // Subrotas (ex.: /trilhas/:id) herdam o título da seção.
  const itemAtual = itens.find(
    (item) =>
      location.pathname === item.to ||
      location.pathname.startsWith(`${item.to}/`),
  )

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

      <aside
        className={`${styles.sidebar} ${showMobileMenu ? styles.sidebarOpen : ''}`}
      >
        <div className={styles.sidebarBrand}>
          <LogoIcon className={styles.logo} />
          <span className={styles.brand}>Nexo</span>
        </div>

        <nav id="primary-navigation" className={styles.nav}>
          {itens.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={navLinkClassName}
              onClick={fecharMenu}
            >
              {ICONE_POR_ROTA[item.to] ?? <GridIcon />}
              {item.rotulo}
            </NavLink>
          ))}

          {/* Só visual — sem rota, sem simular uma funcionalidade que outro
              card ainda vai construir. */}
          {ITENS_EM_BREVE.map((item) => (
            <span key={item.rotulo} className={styles.navItemFuturo}>
              {item.icone}
              <span className={styles.navItemFuturoRotulo}>{item.rotulo}</span>
              <span className={styles.emBreve}>em breve</span>
            </span>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.temaRow}>
            <span>Tema</span>
            <button
              type="button"
              className={styles.botaoTema}
              onClick={alternarTema}
              aria-label={
                tema === 'escuro'
                  ? 'Mudar para o tema claro'
                  : 'Mudar para o tema escuro'
              }
              title="Alternar tema"
            >
              {tema === 'escuro' ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>

          {user && (
            <div className={styles.userCard}>
              <span className={styles.avatar} aria-hidden="true">
                {iniciais(user.nomeCompleto)}
              </span>
              <div>
                <p className={styles.userName}>{user.nomeCompleto}</p>
                <p className={styles.userRole}>{ROTULO_PERFIL[user.papel]}</p>
              </div>
            </div>
          )}

          <button type="button" className={styles.sair} onClick={handleLogout}>
            <LogoutIcon />
            Sair da conta
          </button>
        </div>
      </aside>

      {showMobileMenu && (
        <button
          type="button"
          className={styles.overlay}
          aria-hidden="true"
          tabIndex={-1}
          onClick={fecharMenu}
        />
      )}

      <div className={styles.main}>
        <header className={styles.topbar}>
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

          <p className={styles.pageTitle}>{itemAtual?.rotulo ?? 'Nexo'}</p>

          <div className={styles.topbarActions}>
            <button
              type="button"
              className={styles.bellButton}
              aria-label="Notificações"
            >
              <BellIcon />
              <span className={styles.bellDot} aria-hidden="true" />
            </button>
            {user && (
              <span className={styles.avatarChip} aria-hidden="true">
                {iniciais(user.nomeCompleto)}
              </span>
            )}
          </div>
        </header>

        {/* tabIndex -1: sem isso o atalho acima move o indicador do navegador,
            mas não o foco do teclado. */}
        <main id={CONTEUDO_ID} tabIndex={-1} className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function GridIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2.5"
        y="2.5"
        width="6"
        height="6"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="11.5"
        y="2.5"
        width="6"
        height="6"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="2.5"
        y="11.5"
        width="6"
        height="6"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="11.5"
        y="11.5"
        width="6"
        height="6"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 4.5c1.6-1 4-1 6 0v11c-2-1-4.4-1-6 0v-11zM17 4.5c-1.6-1-4-1-6 0v11c2-1 4.4-1 6 0v-11z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrilhasIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5" cy="16" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="15" cy="10" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M5 6v8M6.6 5l6.8 4M6.6 15l6.8-4"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="7.5" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M2.5 17c0-3 2.2-5 5-5s5 2 5 5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M12.5 4.3c1.3.3 2.2 1.5 2.2 2.9s-.9 2.6-2.2 2.9M14.5 12.3c1.8.5 3 2.2 3 4.7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LayersIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 2.5l7 3.5-7 3.5-7-3.5 7-3.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M3 10l7 3.5 7-3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M3 13.5l7 3.5 7-3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3v14h14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 13l3-4 3 2 4-5.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 2.5l1.4 4.6 4.6 1.4-4.6 1.4L10 14.5l-1.4-4.6-4.6-1.4 4.6-1.4L10 2.5z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 6v4l3 2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 2v2M10 16v2M3.5 3.5l1.4 1.4M15.1 15.1l1.4 1.4M2 10h2M16 10h2M3.5 16.5l1.4-1.4M15.1 4.9l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 14.5A8.5 8.5 0 1110 3.2 7 7 0 0020 14.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 8a5 5 0 0 1 10 0c0 4 1.5 5 1.5 5h-13S5 12 5 8z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8 15.5a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 17H4.5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1H8M13 14l4-4-4-4M17 10H7.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
