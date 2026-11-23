import { useEffect, useState, type FormEvent } from 'react'
import {
  EmpresaServiceError,
  criarEmpresa,
  listarEmpresas,
  sugerirSubdominio,
} from '../services/empresaService.ts'
import type { CriarEmpresaRequest, Empresa } from '../types/empresa.ts'
import type { ApiFieldError } from '../types/api.ts'
import styles from './EmpresasPage.module.css'

const FORMULARIO_VAZIO: CriarEmpresaRequest = {
  nome: '',
  subdominio: '',
  cnpj: '',
  nomeAdministrador: '',
  emailAdministrador: '',
  senhaAdministrador: '',
}

const DATA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

/**
 * Cadastro de empresas (tenants), só para o ADMIN da plataforma. Cada empresa
 * nasce com um administrador, que entra com o próprio e-mail e monta áreas,
 * usuários, documentos e trilhas — sem enxergar nada das outras empresas.
 */
export function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroLista, setErroLista] = useState<string | null>(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [formulario, setFormulario] =
    useState<CriarEmpresaRequest>(FORMULARIO_VAZIO)
  const [subdominioEditado, setSubdominioEditado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])
  const [aviso, setAviso] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    const controle = new AbortController()
    listarEmpresas({ signal: controle.signal })
      .then((lista) => {
        setEmpresas(lista)
        setErroLista(null)
      })
      .catch((erro: unknown) => {
        if (controle.signal.aborted) return
        setErroLista(
          erro instanceof EmpresaServiceError
            ? erro.message
            : 'Não foi possível carregar as empresas.',
        )
      })
      .finally(() => {
        if (!controle.signal.aborted) setCarregando(false)
      })
    return () => controle.abort()
  }, [recarga])

  function erroDoCampo(campo: keyof CriarEmpresaRequest): string | undefined {
    return fieldErrors.find((erro) => erro.field === campo)?.message
  }

  function alterar(campo: keyof CriarEmpresaRequest, valor: string): void {
    setFormulario((atual) => {
      const novo = { ...atual, [campo]: valor }
      if (campo === 'nome' && !subdominioEditado) {
        novo.subdominio = sugerirSubdominio(valor)
      }
      return novo
    })
    if (campo === 'subdominio') setSubdominioEditado(true)
  }

  function fechar(): void {
    setFormularioAberto(false)
    setFormulario(FORMULARIO_VAZIO)
    setSubdominioEditado(false)
    setErroFormulario(null)
    setFieldErrors([])
  }

  async function salvar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    setSalvando(true)
    setErroFormulario(null)
    setFieldErrors([])
    try {
      const criada = await criarEmpresa({
        ...formulario,
        cnpj: formulario.cnpj?.trim() || undefined,
      })
      setAviso(
        `Empresa "${criada.nome}" cadastrada. O administrador já pode entrar com ${formulario.emailAdministrador.trim().toLowerCase()}.`,
      )
      fechar()
      setRecarga((n) => n + 1)
    } catch (erro) {
      if (erro instanceof EmpresaServiceError) {
        setErroFormulario(erro.message)
        setFieldErrors(erro.fieldErrors)
      } else {
        setErroFormulario('Não foi possível cadastrar a empresa.')
      }
    } finally {
      setSalvando(false)
    }
  }

  function campo(
    nome: keyof CriarEmpresaRequest,
    rotulo: string,
    opcoes: {
      tipo?: string
      ajuda?: string
      obrigatorio?: boolean
      autoComplete?: string
    } = {},
  ) {
    const erro = erroDoCampo(nome)
    const id = `empresa-${nome}`
    return (
      <label className={styles.campo} htmlFor={id}>
        {rotulo}
        <input
          id={id}
          type={opcoes.tipo ?? 'text'}
          value={formulario[nome] ?? ''}
          onChange={(evento) => alterar(nome, evento.target.value)}
          required={opcoes.obrigatorio ?? true}
          autoComplete={opcoes.autoComplete ?? 'off'}
          aria-invalid={erro ? 'true' : undefined}
          aria-describedby={erro ? `${id}-erro` : undefined}
        />
        {opcoes.ajuda && <span className={styles.ajuda}>{opcoes.ajuda}</span>}
        {erro && (
          <span id={`${id}-erro`} className={styles.erroCampo}>
            {erro}
          </span>
        )}
      </label>
    )
  }

  return (
    <section className={styles.page} aria-labelledby="empresas-titulo">
      <header className={styles.cabecalho}>
        <div>
          <h1 id="empresas-titulo">Empresas</h1>
          <p className={styles.hint}>
            Cadastre as empresas clientes. Cada uma tem dados, documentos e
            assistente de IA separados das demais.
          </p>
        </div>
        {!formularioAberto && (
          <button
            type="button"
            className={styles.novo}
            onClick={() => {
              setAviso(null)
              setFormularioAberto(true)
            }}
          >
            + Nova empresa
          </button>
        )}
      </header>

      {aviso && (
        <p role="status" className={styles.aviso}>
          {aviso}
        </p>
      )}

      {formularioAberto && (
        <form
          className={styles.formulario}
          onSubmit={(evento) => void salvar(evento)}
          aria-labelledby="nova-empresa-titulo"
        >
          <h2 id="nova-empresa-titulo">Nova empresa</h2>
          {erroFormulario && (
            <p role="alert" className={styles.erro}>
              {erroFormulario}
            </p>
          )}
          <fieldset>
            <legend>Empresa</legend>
            {campo('nome', 'Nome da empresa')}
            {campo('subdominio', 'Subdomínio', {
              ajuda: 'Identificador curto: letras, números e hífen.',
            })}
            {campo('cnpj', 'CNPJ (opcional)', { obrigatorio: false })}
          </fieldset>
          <fieldset>
            <legend>Primeiro administrador</legend>
            {campo('nomeAdministrador', 'Nome completo')}
            {campo('emailAdministrador', 'E-mail de acesso', {
              tipo: 'email',
            })}
            {campo('senhaAdministrador', 'Senha inicial', {
              tipo: 'password',
              autoComplete: 'new-password',
              ajuda:
                'Mínimo de 8 caracteres, com maiúscula, minúscula e número.',
            })}
          </fieldset>
          <div className={styles.acoes}>
            <button type="button" className={styles.cancelar} onClick={fechar}>
              Cancelar
            </button>
            <button type="submit" className={styles.salvar} disabled={salvando}>
              {salvando ? 'Cadastrando…' : 'Cadastrar empresa'}
            </button>
          </div>
        </form>
      )}

      {carregando && <p role="status">Carregando empresas…</p>}
      {erroLista && (
        <div role="alert" className={styles.erro}>
          {erroLista}
        </div>
      )}

      {!carregando && !erroLista && (
        <ul className={styles.lista} aria-label="Empresas cadastradas">
          {empresas.map((empresa) => (
            <li key={empresa.id} className={styles.cartao}>
              <h3>{empresa.nome}</h3>
              {empresa.plataforma && (
                <span className={styles.selo}>Plataforma</span>
              )}
              <dl>
                <dt>Subdomínio</dt>
                <dd>{empresa.subdominio}</dd>
                {empresa.cnpj && (
                  <>
                    <dt>CNPJ</dt>
                    <dd>{empresa.cnpj}</dd>
                  </>
                )}
                <dt>Usuários</dt>
                <dd>{empresa.totalUsuarios}</dd>
                <dt>Desde</dt>
                <dd>{DATA.format(new Date(empresa.criadoEm))}</dd>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
