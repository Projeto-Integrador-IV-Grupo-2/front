import { useEffect, useId, useState, type FormEvent } from 'react'
import { listarConteudos } from '../../services/conteudoService.ts'
import {
  atualizarEtapa,
  criarEtapa,
  EtapaServiceError,
  listarEtapas,
  removerEtapa,
  reordenarEtapas,
} from '../../services/etapaService.ts'
import { ROTULOS_TIPO_CONTEUDO, type Conteudo } from '../../types/conteudo.ts'
import type { Etapa } from '../../types/etapa.ts'
import styles from './EtapasGestao.module.css'

interface EtapasGestaoProps {
  trilhaId: string
  /** Avisa a página que as etapas mudaram — o percentual de quem estuda muda junto. */
  onAlterou: () => void
}

interface Resultado {
  chave: number
  etapas: Etapa[] | null
  erro: string | null
}

function mensagemDe(causa: unknown, padrao: string): string {
  return causa instanceof EtapaServiceError ? causa.message : padrao
}

/**
 * Montagem das etapas da trilha, só para ADMIN e GESTOR (quem renderiza
 * decide). Adiciona no fim, edita, remove e reordena com "subir"/"descer" —
 * botões em vez de arrastar, para funcionar no celular e no teclado.
 *
 * Só conteúdos publicados aparecem para escolha: a API recusa rascunho.
 */
export function EtapasGestao({ trilhaId, onAlterou }: EtapasGestaoProps) {
  const conteudoId = useId()
  const tituloId = useId()
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [conteudos, setConteudos] = useState<Conteudo[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [emEdicao, setEmEdicao] = useState<Etapa | null>(null)
  const [conteudoEscolhido, setConteudoEscolhido] = useState('')
  const [titulo, setTitulo] = useState('')

  // Durante a recarga continua mostrando a última lista: a sequência não pisca
  // a cada etapa adicionada ou movida.
  const etapas = resultado?.etapas ?? null
  const erroBusca = resultado?.chave === recarga ? resultado.erro : null

  useEffect(() => {
    const controlador = new AbortController()
    listarEtapas(trilhaId, { signal: controlador.signal })
      .then((lista) => {
        if (!controlador.signal.aborted) {
          setResultado({ chave: recarga, etapas: lista, erro: null })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setResultado({
            chave: recarga,
            etapas: null,
            erro: mensagemDe(causa, 'Não foi possível carregar as etapas.'),
          })
        }
      })
    return () => controlador.abort()
  }, [trilhaId, recarga])

  useEffect(() => {
    let ativo = true
    listarConteudos({ status: 'PUBLICADO' }, { size: 100 })
      .then((pagina) => {
        if (ativo) {
          setConteudos(pagina.content)
        }
      })
      .catch(() => undefined)
    return () => {
      ativo = false
    }
  }, [])

  async function executar(acao: () => Promise<unknown>, padrao: string) {
    setOcupado(true)
    setErro(null)
    try {
      await acao()
      setRecarga((atual) => atual + 1)
      onAlterou()
      return true
    } catch (causa) {
      setErro(mensagemDe(causa, padrao))
      return false
    } finally {
      setOcupado(false)
    }
  }

  function editar(etapa: Etapa) {
    setEmEdicao(etapa)
    setConteudoEscolhido(etapa.conteudo.id)
    setTitulo(etapa.titulo)
  }

  function limparFormulario() {
    setEmEdicao(null)
    setConteudoEscolhido('')
    setTitulo('')
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!conteudoEscolhido) {
      setErro('Escolha o conteúdo da etapa.')
      return
    }
    const request = {
      conteudoId: conteudoEscolhido,
      titulo: titulo.trim() || null,
      descricao: null,
    }
    const ok = await executar(
      () =>
        emEdicao
          ? atualizarEtapa(trilhaId, emEdicao.id, request)
          : criarEtapa(trilhaId, request),
      'Não foi possível salvar a etapa.',
    )
    if (ok) {
      limparFormulario()
    }
  }

  function mover(indice: number, deslocamento: number) {
    if (!etapas) {
      return
    }
    const ids = etapas.map((etapa) => etapa.id)
    const destino = indice + deslocamento
    ;[ids[indice], ids[destino]] = [ids[destino], ids[indice]]
    void executar(
      () => reordenarEtapas(trilhaId, ids),
      'Não foi possível reordenar as etapas.',
    )
  }

  return (
    <div className={styles.painel}>
      {erro && (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      )}

      {erroBusca && (
        <p className={styles.erro} role="alert">
          {erroBusca}{' '}
          <button
            type="button"
            onClick={() => setRecarga((atual) => atual + 1)}
          >
            Tentar novamente
          </button>
        </p>
      )}

      {etapas === null && !erroBusca && <p role="status">Carregando etapas…</p>}

      {etapas && etapas.length === 0 && (
        <p className={styles.vazio}>
          Nenhuma etapa ainda. Adicione o primeiro conteúdo abaixo.
        </p>
      )}

      {etapas && etapas.length > 0 && (
        <ol className={styles.lista} aria-label="Etapas da trilha">
          {etapas.map((etapa, indice) => (
            <li key={etapa.id} className={styles.item}>
              <span className={styles.ordem}>{etapa.ordem}</span>
              <div className={styles.texto}>
                <strong>{etapa.titulo}</strong>
                <span className={styles.tipo}>
                  {ROTULOS_TIPO_CONTEUDO[etapa.conteudo.tipo]}
                </span>
              </div>
              <div className={styles.acoes}>
                <button
                  type="button"
                  onClick={() => mover(indice, -1)}
                  disabled={ocupado || indice === 0}
                  aria-label={`Subir ${etapa.titulo}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => mover(indice, 1)}
                  disabled={ocupado || indice === etapas.length - 1}
                  aria-label={`Descer ${etapa.titulo}`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => editar(etapa)}
                  disabled={ocupado}
                  aria-label={`Editar ${etapa.titulo}`}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void executar(
                      () => removerEtapa(trilhaId, etapa.id),
                      'Não foi possível remover a etapa.',
                    )
                  }
                  disabled={ocupado}
                  aria-label={`Remover ${etapa.titulo}`}
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form
        className={styles.formulario}
        onSubmit={(event) => void salvar(event)}
      >
        <div className={styles.campo}>
          <label htmlFor={conteudoId}>
            {emEdicao ? 'Conteúdo da etapa' : 'Adicionar conteúdo'}
          </label>
          <select
            id={conteudoId}
            value={conteudoEscolhido}
            onChange={(event) => setConteudoEscolhido(event.target.value)}
            disabled={ocupado}
          >
            <option value="">Escolha um conteúdo publicado</option>
            {conteudos.map((conteudo) => (
              <option key={conteudo.id} value={conteudo.id}>
                {conteudo.titulo} ({ROTULOS_TIPO_CONTEUDO[conteudo.tipo]})
              </option>
            ))}
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor={tituloId}>Título da etapa (opcional)</label>
          <input
            id={tituloId}
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            placeholder="Usa o título do conteúdo"
            disabled={ocupado}
          />
        </div>
        <div className={styles.botoes}>
          {emEdicao && (
            <button type="button" onClick={limparFormulario} disabled={ocupado}>
              Cancelar
            </button>
          )}
          <button type="submit" className={styles.principal} disabled={ocupado}>
            {emEdicao ? 'Salvar etapa' : 'Adicionar etapa'}
          </button>
        </div>
      </form>
    </div>
  )
}
