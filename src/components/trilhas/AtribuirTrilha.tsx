import {
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import type { ApiFieldError } from '../../types/api.ts'
import type {
  AtribuirTrilhaRequest,
  TrilhaDetalhe,
} from '../../types/trilha.ts'
import type { RecursoResumo, Usuario } from '../../types/usuario.ts'
import styles from './AtribuirTrilha.module.css'

interface AtribuirTrilhaProps {
  trilha: TrilhaDetalhe
  /** `null` enquanto a lista carrega. */
  colaboradores: Usuario[] | null
  /**
   * A lista não veio (um gestor recebe 403 em `GET /api/usuarios`): sobra a
   * atribuição por área, que não depende dela.
   */
  colaboradoresIndisponiveis: boolean
  areas: RecursoResumo[]
  salvando: boolean
  erro: string | null
  fieldErrors: ApiFieldError[]
  onAtribuir: (request: AtribuirTrilhaRequest) => void
  onFechar: () => void
}

type Alvo = 'colaboradores' | 'area'

interface ErrosLocais {
  usuarioIds?: string
  areaId?: string
  prazo?: string
}

/** Hoje em `aaaa-mm-dd`, no fuso de quem usa — o mínimo aceito no prazo. */
function hoje(): string {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * Diálogo "Atribuir trilha" do protótipo: a trilha vai para colaboradores
 * escolhidos a dedo **ou** para uma área inteira, com um prazo opcional.
 *
 * Como os outros diálogos da tela, não fala com a API: valida o básico, monta
 * o request e entrega à página, que mostra quantos foram atribuídos e quantos
 * foram ignorados.
 */
export function AtribuirTrilha({
  trilha,
  colaboradores,
  colaboradoresIndisponiveis,
  areas,
  salvando,
  erro,
  fieldErrors,
  onAtribuir,
  onFechar,
}: AtribuirTrilhaProps) {
  const idBase = useId()
  const caixaRef = useRef<HTMLDivElement>(null)
  const [alvoEscolhido, setAlvo] = useState<Alvo>('colaboradores')
  // Sem a lista de pessoas, a atribuição por área é a única possível.
  const alvo: Alvo = colaboradoresIndisponiveis ? 'area' : alvoEscolhido
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [areaId, setAreaId] = useState('')
  const [prazo, setPrazo] = useState('')
  const [busca, setBusca] = useState('')
  const [errosLocais, setErrosLocais] = useState<ErrosLocais>({})

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    const lista = colaboradores ?? []
    if (termo === '') {
      return lista
    }
    return lista.filter((pessoa) =>
      `${pessoa.nomeCompleto} ${pessoa.email}`
        .toLocaleLowerCase('pt-BR')
        .includes(termo),
    )
  }, [colaboradores, busca])

  // O erro da API vence o local: é a resposta mais recente para o campo.
  function erroDoCampo(campo: keyof ErrosLocais): string | undefined {
    return (
      fieldErrors.find((item) => item.field === campo)?.message ??
      errosLocais[campo]
    )
  }

  function alternar(id: string) {
    setErrosLocais((atual) => ({ ...atual, usuarioIds: undefined }))
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id],
    )
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const erros: ErrosLocais = {}
    if (alvo === 'colaboradores' && selecionados.length === 0) {
      erros.usuarioIds = 'Selecione ao menos um colaborador.'
    }
    if (alvo === 'area' && areaId === '') {
      erros.areaId = 'Escolha a área que vai receber a trilha.'
    }
    if (prazo !== '' && prazo < hoje()) {
      erros.prazo = 'O prazo não pode ser uma data passada.'
    }
    setErrosLocais(erros)
    if (Object.keys(erros).length > 0) {
      return
    }

    const dataLimite = prazo === '' ? null : prazo
    onAtribuir(
      alvo === 'area'
        ? { areaId, prazo: dataLimite }
        : { usuarioIds: selecionados, prazo: dataLimite },
    )
  }

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'Escape' && !salvando) {
      evento.stopPropagation()
      onFechar()
      return
    }
    if (evento.key !== 'Tab' || !caixaRef.current) {
      return
    }
    const focaveis = caixaRef.current.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled)',
    )
    const primeiro = focaveis[0]
    const ultimo = focaveis[focaveis.length - 1]
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault()
      ultimo?.focus()
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault()
      primeiro?.focus()
    }
  }

  const ids = {
    titulo: `${idBase}-titulo`,
    apoio: `${idBase}-apoio`,
    busca: `${idBase}-busca`,
    area: `${idBase}-area`,
    prazo: `${idBase}-prazo`,
  }

  function mensagem(campo: keyof ErrosLocais, id: string) {
    const texto = erroDoCampo(campo)
    return texto ? (
      <p id={`${id}-erro`} className={styles.erroCampo}>
        {texto}
      </p>
    ) : null
  }

  return (
    <div className={styles.fundo}>
      <div
        ref={caixaRef}
        className={styles.caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ids.titulo}
        aria-describedby={ids.apoio}
        onKeyDown={aoTeclar}
      >
        <div className={styles.cabecalho}>
          <h2 id={ids.titulo} className={styles.titulo}>
            Atribuir trilha
          </h2>
          <button
            type="button"
            className={styles.fechar}
            onClick={onFechar}
            disabled={salvando}
            aria-label="Fechar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <p id={ids.apoio} className={styles.subtitulo}>
          Quem for escolhido passa a ter “{trilha.nome}” com o prazo definido
          aqui. Quem já tem a trilha é ignorado.
        </p>

        <form className={styles.form} onSubmit={enviar} noValidate>
          {erro && (
            <p className={styles.erro} role="alert">
              {erro}
            </p>
          )}

          <fieldset className={styles.alvo} disabled={salvando}>
            <legend className={styles.legenda}>Quem recebe</legend>
            <label className={styles.opcao}>
              <input
                type="radio"
                name="alvo"
                value="colaboradores"
                checked={alvo === 'colaboradores'}
                onChange={() => setAlvo('colaboradores')}
                disabled={colaboradoresIndisponiveis}
              />
              Colaboradores
            </label>
            <label className={styles.opcao}>
              <input
                type="radio"
                name="alvo"
                value="area"
                checked={alvo === 'area'}
                onChange={() => setAlvo('area')}
              />
              Uma área inteira
            </label>
          </fieldset>

          {colaboradoresIndisponiveis && (
            <p className={styles.dica}>
              Não foi possível carregar os colaboradores. A trilha ainda pode
              ser atribuída a uma área inteira.
            </p>
          )}

          {alvo === 'colaboradores' && !colaboradoresIndisponiveis && (
            <div className={styles.campo}>
              <label htmlFor={ids.busca}>Colaboradores</label>
              <input
                id={ids.busca}
                type="search"
                placeholder="Buscar por nome ou e-mail…"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                aria-describedby={
                  erroDoCampo('usuarioIds') ? `${ids.busca}-erro` : undefined
                }
                disabled={salvando}
              />
              {colaboradores === null ? (
                <p className={styles.dica} role="status">
                  Carregando colaboradores…
                </p>
              ) : visiveis.length === 0 ? (
                <p className={styles.dica}>
                  Nenhum colaborador encontrado para essa busca.
                </p>
              ) : (
                <ul className={styles.lista} aria-label="Colaboradores">
                  {visiveis.map((pessoa) => (
                    <li key={pessoa.id}>
                      <label className={styles.pessoa}>
                        <input
                          type="checkbox"
                          checked={selecionados.includes(pessoa.id)}
                          onChange={() => alternar(pessoa.id)}
                          disabled={salvando}
                        />
                        <span className={styles.avatar} aria-hidden="true">
                          {iniciais(pessoa.nomeCompleto)}
                        </span>
                        <span className={styles.nome}>
                          {pessoa.nomeCompleto}
                        </span>
                        <span className={styles.area}>
                          {pessoa.area?.nome ?? 'Sem área'}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {mensagem('usuarioIds', ids.busca)}
            </div>
          )}

          {alvo === 'area' && (
            <div className={styles.campo}>
              <label htmlFor={ids.area}>Área</label>
              <select
                id={ids.area}
                name="areaId"
                value={areaId}
                onChange={(evento) => {
                  setAreaId(evento.target.value)
                  setErrosLocais((atual) => ({ ...atual, areaId: undefined }))
                }}
                aria-invalid={erroDoCampo('areaId') ? true : undefined}
                aria-describedby={
                  erroDoCampo('areaId') ? `${ids.area}-erro` : undefined
                }
                disabled={salvando}
              >
                <option value="">Escolha uma área</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.nome}
                  </option>
                ))}
              </select>
              {mensagem('areaId', ids.area)}
            </div>
          )}

          <div className={styles.campo}>
            <label htmlFor={ids.prazo}>Prazo</label>
            <input
              id={ids.prazo}
              name="prazo"
              type="date"
              min={hoje()}
              value={prazo}
              onChange={(evento) => {
                setPrazo(evento.target.value)
                setErrosLocais((atual) => ({ ...atual, prazo: undefined }))
              }}
              aria-invalid={erroDoCampo('prazo') ? true : undefined}
              aria-describedby={`${ids.prazo}-dica${
                erroDoCampo('prazo') ? ` ${ids.prazo}-erro` : ''
              }`}
              disabled={salvando}
            />
            <p id={`${ids.prazo}-dica`} className={styles.dica}>
              Sem prazo, vale a duração prevista da trilha.
            </p>
            {mensagem('prazo', ids.prazo)}
          </div>

          <div className={styles.rodape}>
            <button
              type="button"
              className={styles.cancelar}
              onClick={onFechar}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.confirmar}
              disabled={salvando}
            >
              {salvando ? 'Atribuindo…' : 'Atribuir trilha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
