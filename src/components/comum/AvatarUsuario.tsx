import { useFotoPerfil } from '../../hooks/useFotoPerfil.ts'
import { iniciais } from '../../utils/nome.ts'
import styles from './AvatarUsuario.module.css'

interface AvatarUsuarioProps {
  usuarioId: string
  nome: string
  /** Classe de quem usa: define o tamanho e a fonte das iniciais. */
  className?: string
}

/** Foto do usuário ou, sem ela, as iniciais do nome. Decorativo: o nome já está ao lado. */
export function AvatarUsuario({
  usuarioId,
  nome,
  className = '',
}: AvatarUsuarioProps) {
  const foto = useFotoPerfil(usuarioId)
  return (
    <span className={`${styles.avatar} ${className}`} aria-hidden="true">
      {foto ? (
        <img src={foto} alt="" className={styles.foto} />
      ) : (
        iniciais(nome)
      )}
    </span>
  )
}
