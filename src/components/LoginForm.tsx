import { useId, useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth.ts'
import { AuthError } from '../services/authService.ts'
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
    if (error.status === 403) {
      return 'Sua conta está desativada. Fale com um administrador.'
    }
    if (error.status === 401) {
      return 'E-mail ou senha inválidos.'
    }
    return error.message
  }
  return 'Não foi possível entrar. Tente novamente.'
}

/** Formulário de login — validação, chamada ao AuthContext e feedback de erro/loading. */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login } = useAuth()
  const emailId = useId()
  const passwordId = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      const user = await login({ email: email.trim(), password })
      onSuccess(user)
    } catch (error) {
      setFormError(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label htmlFor={emailId}>E-mail</label>
        <input
          id={emailId}
          name="email"
          type="email"
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
