import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { TelaDeAcesso } from '../components/auth/TelaDeAcesso.tsx'
import { ROTAS } from '../routes/paths.ts'
import { AuthError, esqueciSenha } from '../services/authService.ts'
import { HTTP_STATUS } from '../utils/errorHandler.ts'
import formulario from '../components/LoginForm.module.css'
import styles from './RecuperacaoSenha.module.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Sempre a mesma: a tela não pode revelar se o e-mail tem conta. */
export const MENSAGEM_ENVIADO =
  'Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.'

function mensagemDeErro(causa: unknown): string {
  if (causa instanceof AuthError) {
    if (causa.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
      return 'Você fez muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.'
    }
    return causa.message
  }
  return 'Não foi possível enviar o pedido. Tente novamente em instantes.'
}

/**
 * "Esqueci minha senha" (issue #77): pede o e-mail e manda o pedido do link.
 * Depois do envio mostra sempre a mesma mensagem, exista ou não a conta — a
 * API também responde igual. O botão fica desabilitado durante o envio.
 */
export function EsqueciSenhaPage() {
  const emailId = useId()
  const [email, setEmail] = useState('')
  const [erroCampo, setErroCampo] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) {
      return
    }
    const limpo = email.trim()
    if (!limpo) {
      setErroCampo('Informe o e-mail.')
      return
    }
    if (!EMAIL_REGEX.test(limpo)) {
      setErroCampo('Informe um e-mail válido.')
      return
    }
    setErroCampo(null)
    setErro(null)
    setEnviando(true)
    try {
      await esqueciSenha(limpo)
      setEnviado(true)
    } catch (causa) {
      setErro(mensagemDeErro(causa))
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <TelaDeAcesso
        titulo="Verifique seu e-mail"
        subtitulo="Pedido de redefinição enviado."
      >
        <div className={styles.confirmacao}>
          <p className={styles.texto} role="status">
            {MENSAGEM_ENVIADO} O link vale por 30 minutos.
          </p>
          <Link
            to={ROTAS.login}
            className={`${formulario.submit} ${styles.linkBotao}`}
          >
            Voltar ao login
          </Link>
        </div>
      </TelaDeAcesso>
    )
  }

  return (
    <TelaDeAcesso
      titulo="Esqueci minha senha"
      subtitulo="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
    >
      <form className={formulario.form} onSubmit={enviar} noValidate>
        <div className={formulario.field}>
          <label htmlFor={emailId}>E-mail</label>
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            placeholder="voce@empresa.com"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            aria-invalid={erroCampo ? true : undefined}
            aria-describedby={erroCampo ? `${emailId}-erro` : undefined}
            disabled={enviando}
          />
          {erroCampo && (
            <p id={`${emailId}-erro`} className={formulario.fieldError}>
              {erroCampo}
            </p>
          )}
        </div>

        {erro && (
          <p className={formulario.formError} role="alert">
            {erro}
          </p>
        )}

        <button type="submit" className={formulario.submit} disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar link'}
        </button>

        <Link to={ROTAS.login} className={styles.voltar}>
          Voltar ao login
        </Link>
      </form>
    </TelaDeAcesso>
  )
}
