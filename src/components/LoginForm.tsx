import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth.ts'
import { AuthError } from '../services/authService.ts'
import { HTTP_STATUS } from '../utils/errorHandler.ts'
import type { User } from '../types/user.ts'
import styles from './LoginForm.module.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FieldErrors {
  email?: string
  password?: string
}

interface LoginFormProps {
  onSuccess: (user: User) => void
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}

  if (!email.trim()) {
    errors.email = 'Informe o e-mail.'
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Informe um e-mail válido.'
  }

  if (!password) {
    errors.password = 'Informe a senha.'
  }

  return errors
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    if (error.status === HTTP_STATUS.FORBIDDEN) {
      return 'Sua conta está desativada. Fale com um administrador.'
    }
    if (error.status === HTTP_STATUS.UNAUTHORIZED) {
      return 'E-mail ou senha inválidos.'
    }
    return error.message
  }
  return 'Não foi possível entrar. Tente novamente.'
}

function ShieldIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Seletor puramente visual (pedido do protótipo): o perfil de verdade vem de
// `usuario.papel` na resposta da API, então esta escolha não entra no
// envio do formulário — ver LoginRequest em types/auth.ts.
type PerfilVisual = 'ADMIN' | 'COLABORADOR'

const OPCOES_DE_PERFIL: Array<{
  valor: PerfilVisual
  rotulo: string
  descricao: string
  icone: ReactNode
}> = [
  {
    valor: 'ADMIN',
    rotulo: 'Administrador',
    descricao: 'Gestão de pessoas, áreas e conteúdos',
    icone: <ShieldIcon />,
  },
  {
    valor: 'COLABORADOR',
    rotulo: 'Colaborador',
    descricao: 'Trilhas, conhecimento e meu PDI',
    icone: <PersonIcon />,
  },
]

/** Formulário de login — validação, chamada ao AuthContext e feedback de erro/loading. */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login } = useAuth()
  const emailId = useId()
  const passwordId = useId()

  const [perfilVisual, setPerfilVisual] = useState<PerfilVisual>('ADMIN')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [manterConectado, setManterConectado] = useState(true)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    const validationErrors = validate(email, password)
    setFieldErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setFormError(null)
    setIsSubmitting(true)
    try {
      const user = await login({ email: email.trim(), senha: password })
      onSuccess(user)
    } catch (error) {
      setFormError(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <fieldset className={styles.roleFieldset}>
        <legend className={styles.roleLegend}>Entrar como</legend>
        <div className={styles.roleOptions}>
          {OPCOES_DE_PERFIL.map((opcao) => (
            <label
              key={opcao.valor}
              className={`${styles.roleOption} ${
                perfilVisual === opcao.valor ? styles.roleOptionSelected : ''
              }`}
            >
              <input
                type="radio"
                name="perfilVisual"
                value={opcao.valor}
                checked={perfilVisual === opcao.valor}
                onChange={() => setPerfilVisual(opcao.valor)}
                className="visually-hidden"
              />
              {opcao.icone}
              <span className={styles.roleLabel}>{opcao.rotulo}</span>
              <span className={styles.roleDescription}>{opcao.descricao}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor={emailId}>E-mail</label>
        <input
          id={emailId}
          name="email"
          type="email"
          placeholder="voce@empresa.com"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
          disabled={isSubmitting}
        />
        {fieldErrors.email && (
          <span
            id={`${emailId}-error`}
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.email}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor={passwordId}>Senha</label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={
            fieldErrors.password ? `${passwordId}-error` : undefined
          }
          disabled={isSubmitting}
        />
        {fieldErrors.password && (
          <span
            id={`${passwordId}-error`}
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.password}
          </span>
        )}
      </div>

      <div className={styles.optionsRow}>
        <label className={styles.rememberLabel}>
          <input
            type="checkbox"
            checked={manterConectado}
            onChange={(event) => setManterConectado(event.target.checked)}
          />
          Manter conectado
        </label>

        {/* Placeholder visual do protótipo — recuperação de senha ainda não
            tem tela própria. */}
        <button type="button" className={styles.forgotPasswordLink}>
          Esqueci minha senha
        </button>
      </div>

      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={isSubmitting}>
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
