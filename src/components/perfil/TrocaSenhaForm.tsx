import { useId, useState, type FormEvent } from 'react'
import { AvisoSucesso } from '../comum/AvisoSucesso.tsx'
import {
  PerfilServiceError,
  trocarSenha,
} from '../../services/perfilService.ts'
import type { ApiFieldError } from '../../types/api.ts'
import { REGRA_SENHA, validarSenhaForte } from '../../utils/senha.ts'
import {
  criarFormularioSenha,
  type FormularioSenha,
} from './formularioPerfil.ts'
import styles from './PerfilForm.module.css'

type CampoSenha = keyof FormularioSenha

const ROTULOS: Record<CampoSenha, string> = {
  senhaAtual: 'Senha atual',
  novaSenha: 'Nova senha',
  confirmacao: 'Confirme a nova senha',
}

const AUTOCOMPLETE: Record<CampoSenha, string> = {
  senhaAtual: 'current-password',
  novaSenha: 'new-password',
  confirmacao: 'new-password',
}

function validar(valores: FormularioSenha): ApiFieldError[] {
  const erros: ApiFieldError[] = []
  if (valores.senhaAtual === '') {
    erros.push({ field: 'senhaAtual', message: 'Informe a senha atual.' })
  }
  const regra = validarSenhaForte(valores.novaSenha)
  if (regra) {
    erros.push({ field: 'novaSenha', message: regra })
  } else if (valores.novaSenha === valores.senhaAtual) {
    erros.push({
      field: 'novaSenha',
      message: 'A nova senha precisa ser diferente da atual.',
    })
  }
  if (valores.confirmacao !== valores.novaSenha) {
    erros.push({ field: 'confirmacao', message: 'As senhas não conferem.' })
  }
  return erros
}

/**
 * Troca de senha. As senhas ficam só no estado deste componente: não vão para
 * o armazenamento do navegador, para log nem para a URL (o formulário é POST
 * e o envio é sempre interceptado), e são apagadas depois de cada envio.
 */
export function TrocaSenhaForm() {
  const idBase = useId()
  const [valores, setValores] = useState(criarFormularioSenha)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])

  function erroDoCampo(campo: CampoSenha): string | undefined {
    return fieldErrors.find((item) => item.field === campo)?.message
  }

  async function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (salvando) {
      return
    }
    setSucesso(false)
    setErro(null)
    const erros = validar(valores)
    setFieldErrors(erros)
    if (erros.length > 0) {
      return
    }
    setSalvando(true)
    try {
      await trocarSenha({
        senhaAtual: valores.senhaAtual,
        novaSenha: valores.novaSenha,
      })
      setValores(criarFormularioSenha())
      setSucesso(true)
    } catch (falha) {
      if (falha instanceof PerfilServiceError) {
        setFieldErrors(falha.fieldErrors)
        if (falha.fieldErrors.length === 0) {
          setErro(falha.message)
        }
      } else {
        setErro('Não foi possível trocar a senha.')
      }
    } finally {
      setSalvando(false)
    }
  }

  const tituloId = `${idBase}-titulo`
  const dicaId = `${idBase}-dica`
  // A dica some quando o erro do campo já diz a mesma coisa.
  const mostrarDica = !erroDoCampo('novaSenha')

  return (
    <section
      className={styles.secao}
      aria-labelledby={tituloId}
      aria-busy={salvando}
    >
      {/* Rótulo fora do cartão, como os painéis do Dashboard. */}
      <h2 id={tituloId} className={styles.rotulo}>
        Senha de acesso
      </h2>

      <div className={styles.cartao}>
        {erro && (
          <p className={styles.erro} role="alert">
            {erro}
          </p>
        )}
        <AvisoSucesso
          mensagem={
            sucesso
              ? 'Senha alterada. Use a nova senha no próximo acesso.'
              : null
          }
          onSumir={() => setSucesso(false)}
        />

        <form
          className={styles.form}
          method="post"
          onSubmit={aoSubmeter}
          noValidate
        >
          {(Object.keys(ROTULOS) as CampoSenha[]).map((campo) => {
            const id = `${idBase}-${campo}`
            const erroCampo = erroDoCampo(campo)
            const descricao = [
              campo === 'novaSenha' && mostrarDica ? dicaId : null,
              erroCampo ? `${id}-erro` : null,
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <div key={campo} className={styles.campo}>
                <label htmlFor={id}>{ROTULOS[campo]}</label>
                <input
                  id={id}
                  type="password"
                  value={valores[campo]}
                  onChange={(evento) => {
                    const valor = evento.target.value
                    setValores((atual) => ({ ...atual, [campo]: valor }))
                    setSucesso(false)
                  }}
                  autoComplete={AUTOCOMPLETE[campo]}
                  required
                  aria-invalid={erroCampo ? true : undefined}
                  aria-describedby={descricao || undefined}
                />
                {campo === 'novaSenha' && mostrarDica && (
                  <p id={dicaId} className={styles.dica}>
                    {REGRA_SENHA}
                  </p>
                )}
                {erroCampo && (
                  <p id={`${id}-erro`} className={styles.erroCampo}>
                    {erroCampo}
                  </p>
                )}
              </div>
            )
          })}

          <div className={styles.acoes}>
            <button type="submit" className={styles.salvar} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Trocar senha'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
