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

  // O ProtectedRoute guarda em `state.from` a página que o usuário tentou
  // abrir; depois do login ele volta para lá em vez de cair sempre no
  // dashboard. Link direto para /usuarios sobrevive ao desvio pelo login.
  const origem = estado?.from?.pathname

  function handleSuccess() {
    navigate(origem ?? ROTAS.dashboard, { replace: true })
  }

  return (
    <TelaDeAcesso titulo="Entrar" subtitulo="Acesse com sua conta corporativa.">
      <AvisoDeAcesso mensagem={estado?.aviso ?? null} />
      <LoginForm onSuccess={handleSuccess} />
    </TelaDeAcesso>
  )
}
