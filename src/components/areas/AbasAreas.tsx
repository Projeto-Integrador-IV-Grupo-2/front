import { NavLink } from 'react-router-dom'
import { usePermissao } from '../../hooks/usePermissao.ts'
import { ROTAS } from '../../routes/paths.ts'
import { PERFIS_GESTAO_CONTEUDO } from '../../routes/permissions.ts'
import styles from './AbasAreas.module.css'

/**
 * Áreas e Categorias dividem o mesmo item do menu: as duas são cadastros de
 * apoio. Cada aba é uma rota (`/areas` e `/areas/categorias`), então são
 * links. Quem não gerencia conteúdo não vê Categorias — e sem ela não há o
 * que alternar, então as abas nem aparecem.
 */
export function AbasAreas() {
  const veCategorias = usePermissao(PERFIS_GESTAO_CONTEUDO)
  if (!veCategorias) {
    return null
  }

  const classe = ({ isActive }: { isActive: boolean }) =>
    `${styles.aba} ${isActive ? styles.abaAtiva : ''}`

  return (
    <nav className={styles.abas} aria-label="Cadastros de apoio">
      <NavLink to={ROTAS.areas} end className={classe}>
        Áreas
      </NavLink>
      <NavLink to={ROTAS.categorias} className={classe}>
        Categorias
      </NavLink>
    </nav>
  )
}
