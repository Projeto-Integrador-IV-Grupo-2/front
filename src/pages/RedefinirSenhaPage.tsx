import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { RegrasSenha } from '../components/auth/RegrasSenha.tsx'
import { TelaDeAcesso } from '../components/auth/TelaDeAcesso.tsx'
import { ROTAS } from '../routes/paths.ts'
import { AuthError, redefinirSenha } from '../services/authService.ts'
import { HTTP_STATUS } from '../utils/errorHandler.ts'
import { senhaAtendeRegras } from '../utils/regrasSenha.ts'
import formulario from '../components/LoginForm.module.css'
import styles from './RecuperacaoSenha.module.css'

const AVISO_REDEFINIDA = 'Senha redefinida. Entre com a nova senha.'

interface ErrosCampo {
  novaSenha?: string
  confirmacao?: string
}

/**
 * Redefinição de senha pelo link do e-mail (issue #77).
 *
 * <p>O token permanece na URL para que recarregar ou voltar à página não
 * invalide o link; ele nunca é salvo no localStorage. Senhas diferentes ou
 * fora da regra não chamam a API. Link inválido ou expirado mostra a mensagem
 * e o caminho para pedir outro.</p>
 */
export function RedefinirSenhaPage() {
  const navigate = useNavigate()
  const [parametros] = useSearchParams()
  const token = parametros.get('token')
  const senhaId = useId()
  const confirmacaoId = useId()
  const regrasId = useId()

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [errosCampo, setErrosCampo] = useState<ErrosCampo>({})
  const [erro, setErro] = useState<string | null>(null)
  const [linkInvalido, setLinkInvalido] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (salvando || !token) {
      return
    }
    const erros: ErrosCampo = {}
    if (!senhaAtendeRegras(novaSenha)) {
      erros.novaSenha = 'A senha ainda não atende a todas as regras.'
    }
    if (confirmacao !== novaSenha) {
      erros.confirmacao = 'As senhas não são iguais.'
    }
    setErrosCampo(erros)
    if (Object.keys(erros).length > 0) {
      return
    }

    setErro(null)
    setSalvando(true)
    try {
      await redefinirSenha(token, novaSenha)
      navigate(ROTAS.login, {
        replace: true,
        state: { aviso: AVISO_REDEFINIDA },
      })
    } catch (causa) {
      setSalvando(false)
      if (
        causa instanceof AuthError &&
        causa.status === HTTP_STATUS.BAD_REQUEST
      ) {
        const daSenha = causa.fieldErrors.find(
          (campo) => campo.field === 'novaSenha',
        )
        if (daSenha) {
          setErrosCampo({ novaSenha: daSenha.message })
          return
        }
        setLinkInvalido(causa.message)
        return
      }
      setErro(
        causa instanceof AuthError
          ? causa.message
          : 'Não foi possível redefinir a senha.',
      )
    }
  }

  if (!token || linkInvalido) {
    return (
      <TelaDeAcesso
        titulo="Link inválido"
        subtitulo="Não foi possível usar este link de redefinição."
      >
        <div className={styles.confirmacao}>
          <p className={styles.texto} role="alert">
            {linkInvalido ??
              'Este link de redefinição está incompleto. Abra o link do e-mail de novo ou peça um novo.'}
          </p>
          <Link
            to={ROTAS.esqueciSenha}
            className={`${formulario.submit} ${styles.linkBotao}`}
          >
            Pedir um novo link
          </Link>
          <Link to={ROTAS.login} className={styles.voltar}>
            Voltar ao login
          </Link>
        </div>
      </TelaDeAcesso>
    )
  }

  return (
    <TelaDeAcesso
      titulo="Criar nova senha"
      subtitulo="Escolha a nova senha da sua conta."
    >
      <form className={formulario.form} onSubmit={enviar} noValidate>
        <div className={formulario.field}>
          <label htmlFor={senhaId}>Nova senha</label>
          <input
            id={senhaId}
            type="password"
            autoComplete="new-password"
            value={novaSenha}
            onChange={(evento) => setNovaSenha(evento.target.value)}
            aria-invalid={errosCampo.novaSenha ? true : undefined}
            aria-describedby={
              errosCampo.novaSenha ? `${regrasId} ${senhaId}-erro` : regrasId
            }
            disabled={salvando}
          />
          <RegrasSenha senha={novaSenha} id={regrasId} />
          {errosCampo.novaSenha && (
            <p id={`${senhaId}-erro`} className={formulario.fieldError}>
              {errosCampo.novaSenha}
            </p>
          )}
        </div>

        <div className={formulario.field}>
          <label htmlFor={confirmacaoId}>Confirmar nova senha</label>
          <input
            id={confirmacaoId}
            type="password"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
            aria-invalid={errosCampo.confirmacao ? true : undefined}
            aria-describedby={
              errosCampo.confirmacao ? `${confirmacaoId}-erro` : undefined
            }
            disabled={salvando}
          />
          {errosCampo.confirmacao && (
            <p id={`${confirmacaoId}-erro`} className={formulario.fieldError}>
              {errosCampo.confirmacao}
            </p>
          )}
        </div>

        {erro && (
          <p className={formulario.formError} role="alert">
            {erro}
          </p>
        )}

        <button type="submit" className={formulario.submit} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Redefinir senha'}
        </button>
      </form>
    </TelaDeAcesso>
  )
}
