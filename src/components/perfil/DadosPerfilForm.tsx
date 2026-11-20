import { useId, useState, type FormEvent } from 'react'
import { AvisoSucesso } from '../comum/AvisoSucesso.tsx'
import { useAuth } from '../../hooks/useAuth.ts'
import {
  atualizarPerfil,
  PerfilServiceError,
} from '../../services/perfilService.ts'
import type { ApiFieldError } from '../../types/api.ts'
import type { MeResponse } from '../../types/perfil.ts'
import {
  criarFormularioPerfil,
  NAO_INFORMADO,
  type FormularioPerfil,
} from './formularioPerfil.ts'
import styles from './PerfilForm.module.css'

const LINHAS_LEITURA: Array<{
  campo: Exclude<keyof FormularioPerfil, 'nomeCompleto'>
  rotulo: string
}> = [
  { campo: 'email', rotulo: 'E-mail' },
  { campo: 'papel', rotulo: 'Perfil' },
  { campo: 'area', rotulo: 'Área' },
  { campo: 'empresa', rotulo: 'Empresa' },
]

interface DadosPerfilFormProps {
  perfil: MeResponse
}

/**
 * "Dados pessoais": o nome é editável; e-mail, perfil, área e empresa são só
 * leitura. Ao salvar, o nome novo vai para o AuthContext e o cabeçalho
 * acompanha sem recarregar a página.
 */
export function DadosPerfilForm({ perfil }: DadosPerfilFormProps) {
  const idBase = useId()
  const { atualizarUsuario } = useAuth()
  const [formulario, setFormulario] = useState(() =>
    criarFormularioPerfil(perfil),
  )
  const [nomeSalvo, setNomeSalvo] = useState(perfil.nomeCompleto)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])

  const nome = formulario.nomeCompleto.trim()
  const erroNome =
    fieldErrors.find((item) => item.field === 'nomeCompleto')?.message ?? null
  const semMudanca = nome === nomeSalvo

  async function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (salvando) {
      return
    }
    setSucesso(false)
    setErro(null)
    if (nome === '') {
      setFieldErrors([
        { field: 'nomeCompleto', message: 'Informe o seu nome.' },
      ])
      return
    }
    setFieldErrors([])
    setSalvando(true)
    try {
      const atualizado = await atualizarPerfil({ nomeCompleto: nome })
      setFormulario(criarFormularioPerfil(atualizado))
      setNomeSalvo(atualizado.nomeCompleto)
      atualizarUsuario({ nomeCompleto: atualizado.nomeCompleto })
      setSucesso(true)
    } catch (falha) {
      if (falha instanceof PerfilServiceError) {
        setFieldErrors(falha.fieldErrors)
        // Com o erro já embaixo do campo, a faixa no topo seria repetição.
        if (falha.fieldErrors.length === 0) {
          setErro(falha.message)
        }
      } else {
        setErro('Não foi possível salvar o seu nome.')
      }
    } finally {
      setSalvando(false)
    }
  }

  const tituloId = `${idBase}-titulo`

  return (
    <section
      className={styles.secao}
      aria-labelledby={tituloId}
      aria-busy={salvando}
    >
      {/* Rótulo fora do cartão, como os painéis do Dashboard. */}
      <h2 id={tituloId} className={styles.rotulo}>
        Dados pessoais
      </h2>

      <div className={styles.cartao}>
        {erro && (
          <p className={styles.erro} role="alert">
            {erro}
          </p>
        )}
        <AvisoSucesso
          mensagem={sucesso ? 'Nome atualizado.' : null}
          onSumir={() => setSucesso(false)}
        />

        <form
          className={styles.form}
          method="post"
          onSubmit={aoSubmeter}
          noValidate
        >
          <div className={styles.campo}>
            <label htmlFor={`${idBase}-nome`}>Nome completo</label>
            <input
              id={`${idBase}-nome`}
              value={formulario.nomeCompleto}
              onChange={(evento) => {
                const valor = evento.target.value
                setFormulario((atual) => ({ ...atual, nomeCompleto: valor }))
                setSucesso(false)
              }}
              maxLength={150}
              autoComplete="name"
              required
              aria-invalid={erroNome ? true : undefined}
              aria-describedby={erroNome ? `${idBase}-nome-erro` : undefined}
            />
            {erroNome && (
              <p id={`${idBase}-nome-erro`} className={styles.erroCampo}>
                {erroNome}
              </p>
            )}
          </div>

          <dl className={styles.leitura}>
            {LINHAS_LEITURA.filter(
              // O admin não pertence a uma área: a linha some em vez de dizer
              // "Não informado".
              ({ campo }) => campo !== 'area' || perfil.papel !== 'ADMIN',
            ).map(({ campo, rotulo }) => (
              <div key={campo} className={styles.linha}>
                <dt>{rotulo}</dt>
                <dd
                  className={
                    formulario[campo] === NAO_INFORMADO
                      ? styles.vazio
                      : undefined
                  }
                >
                  {formulario[campo]}
                </dd>
              </div>
            ))}
          </dl>

          <div className={styles.acoes}>
            <button
              type="submit"
              className={styles.salvar}
              disabled={salvando || semMudanca}
            >
              {salvando ? 'Salvando…' : 'Salvar nome'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
