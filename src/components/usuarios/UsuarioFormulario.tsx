import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { ApiFieldError } from '../../types/api.ts'
import type { UserRole } from '../../types/user.ts'
import {
  PERFIS,
  ROTULOS_PERFIL,
  type AtualizarUsuarioRequest,
  type CriarUsuarioRequest,
  type RecursoResumo,
  type Usuario,
} from '../../types/usuario.ts'
import styles from './UsuarioFormulario.module.css'

interface UsuarioFormularioProps {
  /** Usuário em edição, ou `null` para cadastro. Decide os campos e o título. */
  usuario: Usuario | null
  /** Áreas ativas para o campo "Área"; a página é quem as busca. */
  areas: RecursoResumo[]
  salvando: boolean
  erro: string | null
  fieldErrors: ApiFieldError[]
  onCriar: (request: CriarUsuarioRequest) => void
  onAtualizar: (id: string, request: AtualizarUsuarioRequest) => void
  onFechar: () => void
}

interface EstadoFormulario {
  nomeCompleto: string
  email: string
  senha: string
  papel: UserRole
  cargoId: string
  areaId: string
  dataEntrada: string
}

const HOJE = () => new Date().toISOString().slice(0, 10)

function estadoInicial(usuario: Usuario | null): EstadoFormulario {
  return {
    nomeCompleto: usuario?.nomeCompleto ?? '',
    email: usuario?.email ?? '',
    senha: '',
    papel: usuario?.papel ?? 'COLABORADOR',
    cargoId: usuario?.cargo?.id ?? '',
    areaId: usuario?.area?.id ?? '',
    dataEntrada: usuario?.dataEntrada ?? HOJE(),
  }
}

/** Campo opcional vazio vai como `null`: a API distingue "não informado" de "". */
function ouNulo(valor: string): string | null {
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

/**
 * Painel de cadastro e de edição. É o mesmo componente nos dois casos — o que
 * muda são os campos que a API aceita em cada operação: e-mail, senha e data
 * de entrada só existem no `POST`, porque o `PUT` não os recebe.
 *
 * O componente não chama a API: recebe `salvando`/`erro` e devolve o request
 * montado, então quem controla o fluxo é a página.
 */
export function UsuarioFormulario({
  usuario,
  areas,
  salvando,
  erro,
  fieldErrors,
  onCriar,
  onAtualizar,
  onFechar,
}: UsuarioFormularioProps) {
  const idBase = useId()
  const edicao = usuario !== null
  // A área atual de quem está em edição pode estar inativa (fora da lista):
  // entra como opção para o select não perder o valor.
  const areaAtual = usuario?.area
  const opcoesArea =
    areaAtual && !areas.some((area) => area.id === areaAtual.id)
      ? [areaAtual, ...areas]
      : areas
  const [valores, setValores] = useState<EstadoFormulario>(() =>
    estadoInicial(usuario),
  )
  const primeiroCampo = useRef<HTMLInputElement>(null)
  // Conferências locais do cadastro: o que a API também recusaria, avisado
  // antes de enviar.
  const [errosLocais, setErrosLocais] = useState<Record<string, string>>({})

  useEffect(() => {
    primeiroCampo.current?.focus()
  }, [])

  function alterar(campo: keyof EstadoFormulario, valor: string) {
    setValores((atual) => ({ ...atual, [campo]: valor }))
  }

  function erroDoCampo(campo: string): string | undefined {
    return (
      errosLocais[campo] ??
      fieldErrors.find((item) => item.field === campo)?.message
    )
  }

  function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (salvando) {
      return
    }

    if (edicao) {
      onAtualizar(usuario.id, {
        nomeCompleto: valores.nomeCompleto.trim(),
        cargoId: ouNulo(valores.cargoId),
        areaId: ouNulo(valores.areaId),
        papel: valores.papel,
      })
      return
    }

    const erros: Record<string, string> = {}
    if (!valores.senha) {
      erros.senha = 'Informe a senha.'
    }
    if (!valores.areaId) {
      erros.areaId = 'Selecione a área.'
    }
    setErrosLocais(erros)
    if (Object.keys(erros).length > 0) {
      return
    }

    onCriar({
      nomeCompleto: valores.nomeCompleto.trim(),
      email: valores.email.trim(),
      senha: valores.senha,
      papel: valores.papel,
      cargoId: ouNulo(valores.cargoId),
      areaId: ouNulo(valores.areaId),
      dataEntrada: valores.dataEntrada,
    })
  }

  const tituloId = `${idBase}-titulo`

  return (
    <section
      className={styles.painel}
      aria-labelledby={tituloId}
      aria-busy={salvando}
    >
      <header className={styles.cabecalho}>
        <h2 id={tituloId}>{edicao ? 'Editar usuário' : 'Novo usuário'}</h2>
        <button
          type="button"
          className={styles.fechar}
          onClick={onFechar}
          aria-label="Fechar formulário"
        >
          ×
        </button>
      </header>

      {erro && (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      )}

      <form className={styles.form} onSubmit={aoSubmeter} noValidate>
        <div className={styles.campo}>
          <label htmlFor={`${idBase}-nome`}>Nome completo</label>
          <input
            id={`${idBase}-nome`}
            ref={primeiroCampo}
            value={valores.nomeCompleto}
            onChange={(evento) => alterar('nomeCompleto', evento.target.value)}
            maxLength={150}
            required
            aria-describedby={
              erroDoCampo('nomeCompleto') ? `${idBase}-nome-erro` : undefined
            }
          />
          {erroDoCampo('nomeCompleto') && (
            <p id={`${idBase}-nome-erro`} className={styles.erroCampo}>
              {erroDoCampo('nomeCompleto')}
            </p>
          )}
        </div>

        {!edicao && (
          <>
            <div className={styles.campo}>
              <label htmlFor={`${idBase}-email`}>E-mail</label>
              <input
                id={`${idBase}-email`}
                type="email"
                value={valores.email}
                onChange={(evento) => alterar('email', evento.target.value)}
                maxLength={255}
                required
                aria-describedby={
                  erroDoCampo('email') ? `${idBase}-email-erro` : undefined
                }
              />
              {erroDoCampo('email') && (
                <p id={`${idBase}-email-erro`} className={styles.erroCampo}>
                  {erroDoCampo('email')}
                </p>
              )}
            </div>

            <div className={styles.campo}>
              <label htmlFor={`${idBase}-senha`}>Senha</label>
              {/* Senha inicial livre: qualquer valor não vazio serve. */}
              <input
                id={`${idBase}-senha`}
                type="password"
                value={valores.senha}
                onChange={(evento) => alterar('senha', evento.target.value)}
                autoComplete="new-password"
              />
              {erroDoCampo('senha') && (
                <p className={styles.erroCampo}>{erroDoCampo('senha')}</p>
              )}
            </div>

            <div className={styles.campo}>
              <label htmlFor={`${idBase}-data`}>Data de entrada</label>
              <input
                id={`${idBase}-data`}
                type="date"
                value={valores.dataEntrada}
                max={HOJE()}
                onChange={(evento) =>
                  alterar('dataEntrada', evento.target.value)
                }
                required
              />
              {erroDoCampo('dataEntrada') && (
                <p className={styles.erroCampo}>{erroDoCampo('dataEntrada')}</p>
              )}
            </div>
          </>
        )}

        <div className={styles.campo}>
          <label htmlFor={`${idBase}-papel`}>Perfil</label>
          <select
            id={`${idBase}-papel`}
            value={valores.papel}
            onChange={(evento) => alterar('papel', evento.target.value)}
          >
            {PERFIS.map((perfil) => (
              <option key={perfil} value={perfil}>
                {ROTULOS_PERFIL[perfil]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.campo}>
          <label htmlFor={`${idBase}-area`}>Área</label>
          <select
            id={`${idBase}-area`}
            value={valores.areaId}
            onChange={(evento) => alterar('areaId', evento.target.value)}
            required={!edicao}
            aria-invalid={Boolean(erroDoCampo('areaId'))}
          >
            <option value="" disabled={!edicao}>
              {edicao ? 'Sem área' : 'Selecione a área'}
            </option>
            {opcoesArea.map((area) => (
              <option key={area.id} value={area.id}>
                {area.nome}
              </option>
            ))}
          </select>
          {erroDoCampo('areaId') && (
            <p className={styles.erroCampo}>{erroDoCampo('areaId')}</p>
          )}
        </div>

        {/* Cargo segue como identificador: a API ainda não lista cargos. */}
        <div className={styles.campo}>
          <label htmlFor={`${idBase}-cargo`}>Cargo (identificador)</label>
          <input
            id={`${idBase}-cargo`}
            value={valores.cargoId}
            onChange={(evento) => alterar('cargoId', evento.target.value)}
            placeholder="Opcional"
          />
          {erroDoCampo('cargoId') && (
            <p className={styles.erroCampo}>{erroDoCampo('cargoId')}</p>
          )}
        </div>

        <div className={styles.acoes}>
          <button type="submit" className={styles.salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : edicao ? 'Salvar' : 'Cadastrar'}
          </button>
          <button
            type="button"
            className={styles.cancelar}
            onClick={onFechar}
            disabled={salvando}
          >
            Cancelar
          </button>
        </div>
      </form>
    </section>
  )
}
