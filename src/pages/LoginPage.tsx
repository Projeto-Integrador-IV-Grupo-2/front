import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LoginForm } from '../components/LoginForm.tsx'
import {
  AvisoDeAcesso,
  TelaDeAcesso,
} from '../components/auth/TelaDeAcesso.tsx'
import { ROTAS } from '../routes/paths.ts'

interface EstadoDoLogin {
  from?: { pathname?: string }
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

  function handleSuccess() {
    navigate(origem ?? ROTAS.dashboard, { replace: true })
  }

  return (
    <TelaDeAcesso titulo="Entrar" subtitulo="Acesse com sua conta corporativa.">
      <AvisoDeAcesso mensagem={aviso} />
      <LoginForm onAttempt={() => setAviso(null)} onSuccess={handleSuccess} />
    </TelaDeAcesso>
  )
}
