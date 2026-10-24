import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAssistente } from '../../hooks/useAssistente.ts'
import { caminhoAssistente } from '../../routes/paths.ts'
import { LIMITE_TITULO } from '../../services/assistenteService.ts'
import type { SessaoAssistente } from '../../types/assistente.ts'
import { Campo, Dialogo } from '../pdi/Dialogo.tsx'
import dialogo from '../pdi/Dialogo.module.css'
import { formatarDataCompleta, formatarDataConversa } from './formatacao.ts'
import { IconeEditar, IconeFechar, IconeLixeira, IconeMais } from './icones.tsx'
import { useHistoricoConversas } from './useHistoricoConversas.ts'
import styles from './HistoricoConversas.module.css'

interface HistoricoConversasProps {
  id: string
  /** No celular o painel é uma gaveta: abre e fecha por cima da conversa. */
  gaveta: boolean
  aberto: boolean
  onFechar: () => void
}

type Acao =
  | { tipo: 'renomear'; sessao: SessaoAssistente }
  | { tipo: 'apagar'; sessao: SessaoAssistente }

/**
 * Painel lateral com as conversas anteriores. Os próprios estados (carregando,
 * vazio, erro) ficam aqui dentro: uma falha no histórico nunca derruba a
 * conversa aberta ao lado.
 */
export function HistoricoConversas({
  id,
  gaveta,
  aberto,
  onFechar,
}: HistoricoConversasProps) {
  const { sessaoId } = useAssistente()
  const navigate = useNavigate()
  const historico = useHistoricoConversas()
  const [acao, setAcao] = useState<Acao | null>(null)
  const listaRef = useRef<HTMLUListElement>(null)
  const fimRef = useRef<HTMLDivElement>(null)
  const novaRef = useRef<HTMLAnchorElement>(null)

  // Rolagem infinita onde houver IntersectionObserver; o botão "Carregar
  // mais" continua lá para teclado e navegadores sem ele.
  const { carregarMais, temMais } = historico
  useEffect(() => {
    const fim = fimRef.current
    if (!fim || !temMais || typeof IntersectionObserver === 'undefined') {
      return
    }
    const observador = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) {
        void carregarMais()
      }
    })
    observador.observe(fim)
    return () => observador.disconnect()
  }, [carregarMais, temMais])

  // A gaveta aberta recebe o foco: quem usa teclado não fica para trás.
  useEffect(() => {
    if (gaveta && aberto) {
      novaRef.current?.focus()
    }
  }, [gaveta, aberto])

  function aoTeclarNoPainel(evento: KeyboardEvent<HTMLElement>) {
    if (gaveta && evento.key === 'Escape' && !acao) {
      evento.stopPropagation()
      onFechar()
    }
  }

  /** Setas, Home e End andam entre as conversas, como numa lista nativa. */
  function aoTeclarNaLista(evento: KeyboardEvent<HTMLUListElement>) {
    const links = Array.from(
      listaRef.current?.querySelectorAll<HTMLAnchorElement>(
        'a[data-conversa]',
      ) ?? [],
    )
    const atual = links.indexOf(document.activeElement as HTMLAnchorElement)
    const destinos: Record<string, number> = {
      ArrowDown: Math.min(atual + 1, links.length - 1),
      ArrowUp: Math.max(atual - 1, 0),
      Home: 0,
      End: links.length - 1,
    }
    if (!(evento.key in destinos) || links.length === 0) {
      return
    }
    evento.preventDefault()
    links[atual === -1 ? 0 : destinos[evento.key]]?.focus()
  }

  async function apagar(sessao: SessaoAssistente) {
    await historico.apagar(sessao.id)
    setAcao(null)
    // Apagar a conversa aberta leva a uma conversa nova.
    if (sessao.id === sessaoId) {
      navigate(caminhoAssistente(), { replace: true })
    }
  }

  const classes = [
    styles.painel,
    gaveta ? styles.gaveta : '',
    gaveta && aberto ? styles.aberto : '',
  ].join(' ')

  return (
    <>
      <aside
        id={id}
        className={classes}
        aria-label="Histórico de conversas"
        // Gaveta fechada: fora da tela e fora do Tab.
        inert={gaveta && !aberto}
        onKeyDown={aoTeclarNoPainel}
      >
        <div className={styles.cabecalho}>
          <h2 className={styles.titulo}>Conversas</h2>
          {gaveta && (
            <button
              type="button"
              className={styles.icone}
              onClick={onFechar}
              aria-label="Fechar histórico"
            >
              <IconeFechar />
            </button>
          )}
        </div>

        <Link
          ref={novaRef}
          to={caminhoAssistente()}
          className={styles.nova}
          onClick={gaveta ? onFechar : undefined}
        >
          <IconeMais tamanho={14} />
          Nova conversa
        </Link>

        <div className={styles.corpo}>
          {historico.carregando ? (
            <p className={styles.aviso} role="status">
              Carregando conversas…
            </p>
          ) : historico.erro ? (
            <div className={styles.erro} role="alert">
              <p>{historico.erro}</p>
              <button
                type="button"
                className={styles.link}
                onClick={historico.tentarDeNovo}
              >
                Tentar de novo
              </button>
            </div>
          ) : historico.sessoes.length === 0 ? (
            <p className={styles.aviso}>
              Nenhuma conversa ainda. Suas perguntas ao assistente aparecem
              aqui.
            </p>
          ) : (
            <>
              <ul
                ref={listaRef}
                className={styles.lista}
                onKeyDown={aoTeclarNaLista}
              >
                {historico.sessoes.map((sessao) => {
                  const atual = sessao.id === sessaoId
                  return (
                    <li
                      key={sessao.id}
                      className={`${styles.item} ${atual ? styles.itemAtual : ''}`}
                    >
                      <Link
                        to={caminhoAssistente(sessao.id)}
                        className={styles.conversa}
                        aria-current={atual ? 'page' : undefined}
                        data-conversa
                        onClick={gaveta ? onFechar : undefined}
                      >
                        <span className={styles.tituloConversa}>
                          {sessao.titulo}
                        </span>
                        <time
                          className={styles.data}
                          dateTime={sessao.atualizadoEm}
                          title={formatarDataCompleta(sessao.atualizadoEm)}
                        >
                          {formatarDataConversa(sessao.atualizadoEm)}
                        </time>
                      </Link>
                      <div className={styles.acoes}>
                        <button
                          type="button"
                          className={styles.icone}
                          aria-label={`Renomear conversa “${sessao.titulo}”`}
                          title="Renomear"
                          onClick={() => setAcao({ tipo: 'renomear', sessao })}
                        >
                          <IconeEditar tamanho={14} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.icone} ${styles.iconePerigo}`}
                          aria-label={`Apagar conversa “${sessao.titulo}”`}
                          title="Apagar"
                          onClick={() => setAcao({ tipo: 'apagar', sessao })}
                        >
                          <IconeLixeira tamanho={14} />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div ref={fimRef} className={styles.fim}>
                {historico.erroMais && (
                  <p className={styles.erroMais} role="alert">
                    {historico.erroMais}
                  </p>
                )}
                {historico.temMais && (
                  <button
                    type="button"
                    className={styles.carregarMais}
                    onClick={() => void carregarMais()}
                    disabled={historico.carregandoMais}
                  >
                    {historico.carregandoMais
                      ? 'Carregando…'
                      : 'Carregar mais conversas'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </aside>

      {gaveta && aberto && (
        <button
          type="button"
          className={styles.fundo}
          aria-hidden="true"
          tabIndex={-1}
          onClick={onFechar}
        />
      )}

      {acao?.tipo === 'renomear' && (
        <RenomearConversa
          sessao={acao.sessao}
          onRenomear={historico.renomear}
          onFechar={() => setAcao(null)}
        />
      )}
      {acao?.tipo === 'apagar' && (
        <ApagarConversa
          sessao={acao.sessao}
          onApagar={() => apagar(acao.sessao)}
          onFechar={() => setAcao(null)}
        />
      )}
    </>
  )
}

interface RenomearConversaProps {
  sessao: SessaoAssistente
  onRenomear: (id: string, titulo: string) => Promise<void>
  onFechar: () => void
}

function RenomearConversa({
  sessao,
  onRenomear,
  onFechar,
}: RenomearConversaProps) {
  const [titulo, setTitulo] = useState(sessao.titulo)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    const limpo = titulo.trim()
    if (!limpo) {
      setErro('Informe um título para a conversa.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await onRenomear(sessao.id, limpo)
      onFechar()
    } catch (causa) {
      setErro(
        causa instanceof Error
          ? causa.message
          : 'Não foi possível renomear a conversa.',
      )
      setSalvando(false)
    }
  }

  return (
    <Dialogo
      titulo="Renomear conversa"
      subtitulo="O novo título aparece no histórico de conversas."
      ocupado={salvando}
      onFechar={onFechar}
    >
      <form className={dialogo.form} onSubmit={aoEnviar} noValidate>
        <Campo id="titulo-conversa" rotulo="Título" cheio>
          <input
            id="titulo-conversa"
            value={titulo}
            maxLength={LIMITE_TITULO}
            onChange={(e) => setTitulo(e.target.value)}
            disabled={salvando}
          />
        </Campo>
        {erro && (
          <p className={dialogo.erro} role="alert">
            {erro}
          </p>
        )}
        <div className={dialogo.rodape}>
          <button
            type="button"
            className={dialogo.cancelar}
            onClick={onFechar}
            disabled={salvando}
          >
            Cancelar
          </button>
          <button type="submit" className={dialogo.criar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

interface ApagarConversaProps {
  sessao: SessaoAssistente
  onApagar: () => Promise<void>
  onFechar: () => void
}

function ApagarConversa({ sessao, onApagar, onFechar }: ApagarConversaProps) {
  const [apagando, setApagando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const confirmarRef = useRef<HTMLButtonElement>(null)

  // Sem campo para focar, o foco vai para a ação — o Dialogo só foca inputs.
  useEffect(() => {
    confirmarRef.current?.focus()
  }, [])

  async function confirmar() {
    setApagando(true)
    setErro(null)
    try {
      await onApagar()
    } catch (causa) {
      setErro(
        causa instanceof Error
          ? causa.message
          : 'Não foi possível apagar a conversa.',
      )
      setApagando(false)
    }
  }

  return (
    <Dialogo
      titulo="Apagar conversa?"
      subtitulo={`“${sessao.titulo}” e todas as mensagens dela serão apagadas. Não dá para desfazer.`}
      ocupado={apagando}
      onFechar={onFechar}
    >
      {erro && (
        <p className={dialogo.erro} role="alert">
          {erro}
        </p>
      )}
      <div className={dialogo.rodape}>
        <button
          type="button"
          className={dialogo.cancelar}
          onClick={onFechar}
          disabled={apagando}
        >
          Cancelar
        </button>
        <button
          ref={confirmarRef}
          type="button"
          className={`${dialogo.criar} ${styles.perigo}`}
          onClick={() => void confirmar()}
          disabled={apagando}
        >
          {apagando ? 'Apagando…' : 'Apagar'}
        </button>
      </div>
    </Dialogo>
  )
}
