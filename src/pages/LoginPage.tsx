import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LoginForm } from '../components/LoginForm.tsx'
import {
  AvisoDeAcesso,
  TelaDeAcesso,
} from '../components/auth/TelaDeAcesso.tsx'
import { ROTAS } from '../routes/paths.ts'
import type { User } from '../types/user.ts'

interface EstadoDoLogin {
  from?: { pathname?: string }
  /** De quem era a sessão que caiu; ausente num link aberto sem sessão. */
  usuarioId?: string | null
  /** Mensagem de sucesso de quem chegou aqui (ex.: senha redefinida). */
  aviso?: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const estado = location.state as EstadoDoLogin | null
  const [aviso, setAviso] = useState(() => estado?.aviso ?? null)

  useEffect(() => {
    if (estado?.aviso) {
      navigate(`${location.pathname}${location.search}${location.hash}`, {
        replace: true,
        state: estado.from ? { from: estado.from } : null,
      })
    }
  }, [estado, location.hash, location.pathname, location.search, navigate])

  // O ProtectedRoute guarda em `state.from` a página que o usuário tentou
  // abrir; depois do login ele volta para lá em vez de cair sempre no
  // dashboard. Link direto para /usuarios sobrevive ao desvio pelo login.
  const origem = estado?.from?.pathname

  function handleSuccess(usuario: User) {
    // A página guardada é de quem estava na sessão que caiu. Outra pessoa
    // entrando (ex.: o colaborador depois do admin) começa no Dashboard, e não
    // no Perfil ou na tela em que a sessão anterior parou.
    const mesmaPessoa = !estado?.usuarioId || estado.usuarioId === usuario.id
    navigate(origem && mesmaPessoa ? origem : ROTAS.dashboard, {
      replace: true,
    })
  }

  return (
    <TelaDeAcesso titulo="Entrar" subtitulo="Acesse com sua conta corporativa.">
      <AvisoDeAcesso mensagem={aviso} />
      <LoginForm onAttempt={() => setAviso(null)} onSuccess={handleSuccess} />
    </TelaDeAcesso>
  )
}
