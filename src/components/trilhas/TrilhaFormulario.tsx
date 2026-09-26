import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import type { ApiFieldError } from '../../types/api.ts'
import type { CriarTrilhaRequest } from '../../types/trilha.ts'
import type { RecursoResumo } from '../../types/usuario.ts'
import styles from './TrilhaFormulario.module.css'

interface TrilhaFormularioProps {
  areas: RecursoResumo[]
  /** As áreas não carregaram: o cadastro segue, só sem escolher área. */
  areasIndisponiveis: boolean
  salvando: boolean
  erro: string | null
  fieldErrors: ApiFieldError[]
  onCriar: (request: CriarTrilhaRequest) => void
  onFechar: () => void
}

const NOME_MAX = 200
const PRAZO_MAX_DIAS = 365

interface Campos {
  nome: string
  areaId: string
  prazoDias: string
  objetivos: string
}

type ErrosLocais = Partial<Record<keyof Campos, string>>

function validar(campos: Campos): ErrosLocais {
  const erros: ErrosLocais = {}
  const nome = campos.nome.trim()
  if (nome === '') {
    erros.nome = 'Informe o nome da trilha.'
  } else if (nome.length > NOME_MAX) {
    erros.nome = `O nome pode ter no máximo ${NOME_MAX} caracteres.`
  }

  if (campos.prazoDias.trim() !== '') {
    const prazo = Number(campos.prazoDias)
    if (!Number.isInteger(prazo) || prazo < 1 || prazo > PRAZO_MAX_DIAS) {
      erros.prazoDias = `Use um número inteiro de dias entre 1 e ${PRAZO_MAX_DIAS}.`
    }
  }
  return erros
}

function ouNulo(valor: string): string | null {
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

/**
 * Diálogo "Nova trilha" do protótipo. Não chama a API: valida o básico, monta
 * o request e devolve para a página, que controla envio, erro e fechamento.
 *
 * Por ser modal, prende o foco (Tab circula dentro do diálogo) e fecha com
 * Esc — exceto enquanto salva, para o envio não ficar sem resposta na tela.
 */
export function TrilhaFormulario({
  areas,
  areasIndisponiveis,
  salvando,
  erro,
  fieldErrors,
  onCriar,
  onFechar,
}: TrilhaFormularioProps) {
  const idBase = useId()
  const caixaRef = useRef<HTMLDivElement>(null)
  const nomeRef = useRef<HTMLInputElement>(null)
  const [campos, setCampos] = useState<Campos>({
    nome: '',
    areaId: '',
    prazoDias: '',
    objetivos: '',
  })
  const [errosLocais, setErrosLocais] = useState<ErrosLocais>({})

  useEffect(() => {
    nomeRef.current?.focus()
  }, [])

  // O erro da API vence o local: é a resposta mais recente para o campo.
  function erroDoCampo(campo: keyof Campos): string | undefined {
    return (
      fieldErrors.find((erro) => erro.field === campo)?.message ??
      errosLocais[campo]
    )
  }

  function alterar(campo: keyof Campos, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }))
    if (errosLocais[campo]) {
      setErrosLocais((atual) => ({ ...atual, [campo]: undefined }))
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const erros = validar(campos)
    setErrosLocais(erros)
    if (Object.keys(erros).length > 0) {
      // Leva o foco ao primeiro campo com problema, onde está a mensagem.
      const primeiro = Object.keys(erros)[0]
      caixaRef.current
        ?.querySelector<HTMLElement>(`[name="${primeiro}"]`)
        ?.focus()
      return
    }

    onCriar({
      nome: campos.nome.trim(),
      areaId: campos.areaId === '' ? null : campos.areaId,
      prazoDias:
        campos.prazoDias.trim() === '' ? null : Number(campos.prazoDias),
      objetivos: ouNulo(campos.objetivos),
    })
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
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)',
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
    descricao: `${idBase}-descricao`,
    nome: `${idBase}-nome`,
    area: `${idBase}-area`,
    prazo: `${idBase}-prazo`,
    objetivos: `${idBase}-objetivos`,
  }

  function mensagem(campo: keyof Campos, id: string) {
    const texto = erroDoCampo(campo)
    return texto ? (
      <p id={`${id}-erro`} className={styles.erroCampo}>
        {texto}
      </p>
    ) : null
  }

  function descritoPor(campo: keyof Campos, id: string, dica?: string) {
    const partes = [dica, erroDoCampo(campo) ? `${id}-erro` : undefined]
    const valor = partes.filter(Boolean).join(' ')
    return valor === '' ? undefined : valor
  }

  return (
    <div className={styles.fundo}>
      <div
        ref={caixaRef}
        className={styles.caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ids.titulo}
        aria-describedby={ids.descricao}
        onKeyDown={aoTeclar}
      >
        <div className={styles.cabecalho}>
          <h2 id={ids.titulo} className={styles.titulo}>
            Nova trilha
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
        <p id={ids.descricao} className={styles.subtitulo}>
          Defina o nome, a área e o objetivo. As etapas são montadas depois.
        </p>

        <form className={styles.form} onSubmit={enviar} noValidate>
          {/* Rótulo de grupo do protótipo; o título do diálogo já diz isso
              ao leitor de tela. */}
          <p className={styles.grupo} aria-hidden="true">
            Dados da trilha
          </p>

          {erro && (
            <p className={styles.erro} role="alert">
              {erro}
            </p>
          )}

          <div className={`${styles.campo} ${styles.cheio}`}>
            <label htmlFor={ids.nome}>Nome da trilha</label>
            <input
              ref={nomeRef}
              id={ids.nome}
              name="nome"
              type="text"
              placeholder="Ex.: Excelência em Vendas"
              maxLength={NOME_MAX}
              value={campos.nome}
              onChange={(evento) => alterar('nome', evento.target.value)}
              aria-invalid={erroDoCampo('nome') ? true : undefined}
              aria-describedby={descritoPor('nome', ids.nome)}
              aria-required="true"
              disabled={salvando}
            />
            {mensagem('nome', ids.nome)}
          </div>

          <div className={styles.campo}>
            <label htmlFor={ids.area}>Área</label>
            <select
              id={ids.area}
              name="areaId"
              value={campos.areaId}
              onChange={(evento) => alterar('areaId', evento.target.value)}
              aria-describedby={
                areasIndisponiveis ? `${ids.area}-dica` : undefined
              }
              disabled={salvando}
            >
              <option value="">Multi-área</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.nome}
                </option>
              ))}
            </select>
            {areasIndisponiveis && (
              <p id={`${ids.area}-dica`} className={styles.dica}>
                Não foi possível carregar as áreas. A trilha pode ser criada
                como multi-área.
              </p>
            )}
          </div>

          <div className={styles.campo}>
            <label htmlFor={ids.prazo}>Prazo (dias)</label>
            <input
              id={ids.prazo}
              name="prazoDias"
              type="number"
              inputMode="numeric"
              min={1}
              max={PRAZO_MAX_DIAS}
              placeholder="Ex.: 30"
              value={campos.prazoDias}
              onChange={(evento) => alterar('prazoDias', evento.target.value)}
              aria-invalid={erroDoCampo('prazoDias') ? true : undefined}
              aria-describedby={descritoPor('prazoDias', ids.prazo)}
              disabled={salvando}
            />
            {mensagem('prazoDias', ids.prazo)}
          </div>

          <div className={`${styles.campo} ${styles.cheio}`}>
            <label htmlFor={ids.objetivos}>Objetivo</label>
            <textarea
              id={ids.objetivos}
              name="objetivos"
              rows={3}
              placeholder="O que essa trilha deve desenvolver?"
              value={campos.objetivos}
              onChange={(evento) => alterar('objetivos', evento.target.value)}
              aria-invalid={erroDoCampo('objetivos') ? true : undefined}
              aria-describedby={descritoPor('objetivos', ids.objetivos)}
              disabled={salvando}
            />
            {mensagem('objetivos', ids.objetivos)}
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
            <button type="submit" className={styles.criar} disabled={salvando}>
              {salvando ? 'Criando…' : 'Criar trilha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
