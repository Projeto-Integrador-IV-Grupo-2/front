import { useEffect, useState } from 'react'
import type { MarcoDeCarga } from '../contexts/NotificacoesContext.tsx'
import { NotificacaoItem } from '../components/notificacoes/NotificacaoItem.tsx'
import { useAbrirNotificacao } from '../components/notificacoes/useAbrirNotificacao.ts'
import { useNotificacoes } from '../hooks/useNotificacoes.ts'
import {
  listarNotificacoes,
  NotificacaoServiceError,
} from '../services/notificacaoService.ts'
import type { Notificacao } from '../types/notificacao.ts'
import type { Pagina } from '../types/usuario.ts'
import styles from './NotificacoesPage.module.css'

type Filtro = 'todas' | 'naoLidas'

interface Consulta {
  filtro: Filtro
  pagina: number
  tentativa: number
}

type Resultado =
  | {
      chave: string
      status: 'pronto'
      dados: Pagina<Notificacao>
      carregadaEm: MarcoDeCarga
    }
  | { chave: string; status: 'erro'; mensagem: string }

function chaveDe({ filtro, pagina, tentativa }: Consulta): string {
  return `${filtro}:${pagina}:${tentativa}`
}

function mensagemDe(causa: unknown, padrao: string): string {
  return causa instanceof NotificacaoServiceError ? causa.message : padrao
}

/**
 * Todas as notificações do usuário, paginadas e das mais recentes para as
 * mais antigas, com o filtro de não lidas. O estado de "lida" vem do
 * NotificacoesContext: marcar aqui atualiza o sino, e marcar no sino atualiza
 * esta lista.
 */
export function NotificacoesPage() {
  const { total, marcoAtual, estaLida, marcarTodasComoLidas } =
    useNotificacoes()
  const abrirNotificacao = useAbrirNotificacao()
  const [consulta, setConsulta] = useState<Consulta>({
    filtro: 'todas',
    pagina: 0,
    tentativa: 0,
  })
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [marcandoTodas, setMarcandoTodas] = useState(false)
  const [erroAcao, setErroAcao] = useState<string | null>(null)

  const chave = chaveDe(consulta)

  useEffect(() => {
    const controlador = new AbortController()
    const carregadaEm = marcoAtual()
    listarNotificacoes({
      page: consulta.pagina,
      naoLidas: consulta.filtro === 'naoLidas',
      signal: controlador.signal,
    })
      .then((dados) => {
        if (!controlador.signal.aborted) {
          setResultado({ chave, status: 'pronto', dados, carregadaEm })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setResultado({
            chave,
            status: 'erro',
            mensagem: mensagemDe(
              causa,
              'Não foi possível carregar as notificações.',
            ),
          })
        }
      })
    return () => controlador.abort()
  }, [chave, consulta.pagina, consulta.filtro, marcoAtual])

  // O resultado de outra consulta não vale para a atual: enquanto a nova não
  // chega, a tela mostra "carregando" (derivado, sem efeito para limpar).
  const atual = resultado?.chave === chave ? resultado : null
  const dados = atual?.status === 'pronto' ? atual.dados : null
  const itens = dados?.content ?? []
  const totalPaginas = dados ? Math.max(1, dados.page.totalPages) : 1

  function trocarFiltro(filtro: Filtro) {
    if (filtro !== consulta.filtro) {
      setConsulta({ filtro, pagina: 0, tentativa: consulta.tentativa })
    }
  }

  function irParaPagina(pagina: number) {
    setConsulta((anterior) => ({ ...anterior, pagina }))
  }

  async function marcarTodas() {
    setMarcandoTodas(true)
    setErroAcao(null)
    try {
      await marcarTodasComoLidas()
    } catch (causa) {
      setErroAcao(
        mensagemDe(
          causa,
          'Não foi possível marcar as notificações como lidas.',
        ),
      )
    } finally {
      setMarcandoTodas(false)
    }
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Notificações</h1>
          <p className={styles.hint}>
            Trilhas atribuídas, prazos, conclusões e conteúdos novos.
          </p>
        </div>
        <button
          type="button"
          className={styles.botao}
          onClick={() => void marcarTodas()}
          disabled={!total || marcandoTodas}
        >
          {marcandoTodas ? 'Marcando…' : 'Marcar todas como lidas'}
        </button>
      </div>

      <div className={styles.filtros} role="group" aria-label="Filtrar">
        <button
          type="button"
          className={styles.filtro}
          aria-pressed={consulta.filtro === 'todas'}
          onClick={() => trocarFiltro('todas')}
        >
          Todas
        </button>
        <button
          type="button"
          className={styles.filtro}
          aria-pressed={consulta.filtro === 'naoLidas'}
          onClick={() => trocarFiltro('naoLidas')}
        >
          Não lidas{total ? ` (${total})` : ''}
        </button>
      </div>

      {erroAcao && (
        <p className={styles.erroAcao} role="alert">
          {erroAcao}
        </p>
      )}

      {!atual && (
        <p className={styles.aviso} role="status">
          Carregando notificações…
        </p>
      )}

      {atual?.status === 'erro' && (
        <div className={styles.erro} role="alert">
          <p>{atual.mensagem}</p>
          <button
            type="button"
            onClick={() =>
              setConsulta((anterior) => ({
                ...anterior,
                tentativa: anterior.tentativa + 1,
              }))
            }
          >
            Tentar novamente
          </button>
        </div>
      )}

      {atual?.status === 'pronto' && itens.length === 0 && (
        <div className={styles.vazio}>
          <p className={styles.vazioTitulo}>
            {consulta.filtro === 'naoLidas'
              ? 'Nenhuma notificação não lida'
              : 'Você ainda não tem notificações'}
          </p>
          <p>
            {consulta.filtro === 'naoLidas'
              ? 'Tudo em dia por aqui.'
              : 'Quando uma trilha for atribuída a você ou um prazo se aproximar, o aviso aparece aqui.'}
          </p>
        </div>
      )}

      {atual?.status === 'pronto' && itens.length > 0 && (
        <ul className={styles.lista}>
          {itens.map((notificacao) => (
            <li key={notificacao.id}>
              <NotificacaoItem
                notificacao={notificacao}
                lida={estaLida(notificacao, atual.carregadaEm)}
                onAbrir={(clicada) =>
                  abrirNotificacao(clicada, atual.carregadaEm)
                }
              />
            </li>
          ))}
        </ul>
      )}

      {dados && dados.page.totalPages > 1 && (
        <nav className={styles.paginacao} aria-label="Paginação">
          <button
            type="button"
            className={styles.botao}
            onClick={() => irParaPagina(consulta.pagina - 1)}
            disabled={consulta.pagina === 0}
          >
            Anterior
          </button>
          <span className={styles.paginaAtual}>
            Página {consulta.pagina + 1} de {totalPaginas}
          </span>
          <button
            type="button"
            className={styles.botao}
            onClick={() => irParaPagina(consulta.pagina + 1)}
            disabled={consulta.pagina >= totalPaginas - 1}
          >
            Próxima
          </button>
        </nav>
      )}
    </div>
  )
}
