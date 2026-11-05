import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  IconeBusca,
  IconeCheck,
  IconeFaisca,
  IconeLivro,
  IconePlay,
} from '../components/historico/icones.tsx'
import { useAuth } from '../hooks/useAuth.ts'
import { caminhoTrilha } from '../routes/paths.ts'
import {
  HistoricoServiceError,
  listarHistorico,
} from '../services/historicoService.ts'
import type { InteracaoHistorico } from '../types/historico.ts'
import type { Pagina } from '../types/usuario.ts'
import styles from './HistoricoPage.module.css'

const HORA = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})
const DIA = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function inicioDoDia(data: Date): number {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime()
}

/** "Hoje", "Ontem" ou a data por extenso. */
function rotuloDoDia(iso: string, agora = new Date()): string {
  const dias = Math.round(
    (inicioDoDia(agora) - inicioDoDia(new Date(iso))) / 86_400_000,
  )
  if (dias === 0) {
    return 'Hoje'
  }
  if (dias === 1) {
    return 'Ontem'
  }
  return DIA.format(new Date(iso))
}

interface Linha {
  id: string
  texto: string
  hora: string
  dia: string
  icone: ReactNode
  /** Para onde a linha leva, quando dá para retomar (a trilha). */
  para?: string
}

/**
 * Texto de cada interação. A consulta à IA não tem a pergunta: a API guarda
 * só se a resposta encontrou fontes na base, por privacidade.
 */
function descrever(item: InteracaoHistorico): {
  acao: string
  icone: ReactNode
  para?: string
} {
  const trilha = item.detalhes.trilhaNome ?? 'uma trilha'
  const para = item.detalhes.trilhaId
    ? caminhoTrilha(item.detalhes.trilhaId)
    : undefined
  switch (item.tipo) {
    case 'TRILHA_ACESSADA':
      return {
        acao: `acessou a trilha “${trilha}”`,
        icone: <IconeLivro tamanho={14} />,
        para,
      }
    case 'TRILHA_INICIADA':
      return {
        acao: `iniciou a trilha “${trilha}”`,
        icone: <IconePlay tamanho={14} />,
        para,
      }
    case 'TRILHA_CONCLUIDA':
      return {
        acao: `concluiu a trilha “${trilha}”`,
        icone: <IconeCheck tamanho={14} />,
        para,
      }
    case 'ASSISTENTE_CONSULTADO': {
      const fontes = item.detalhes.quantidadeFontes ?? 0
      return {
        acao: item.detalhes.encontrouFontes
          ? `perguntou à IA (resposta com ${fontes} ${fontes === 1 ? 'fonte' : 'fontes'} da base)`
          : 'perguntou à IA (nada encontrado na base)',
        icone: <IconeFaisca tamanho={14} />,
      }
    }
    case 'SENHA_REDEFINIDA':
      return {
        acao: 'redefiniu a senha pelo link do e-mail',
        icone: <IconeCheck tamanho={14} />,
      }
    default:
      return { acao: 'teve uma interação', icone: <IconeLivro tamanho={14} /> }
  }
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

interface Estado {
  paginas: Pagina<InteracaoHistorico>[]
  carregando: boolean
  carregandoMais: boolean
  erro: string | null
  erroMais: string | null
}

const INICIAL: Estado = {
  paginas: [],
  carregando: true,
  carregandoMais: false,
  erro: null,
  erroMais: null,
}

function mensagemDe(causa: unknown, padrao: string): string {
  return causa instanceof HistoricoServiceError ? causa.message : padrao
}

/**
 * Histórico de interações na plataforma (`GET /api/historico`): trilhas
 * acessadas, iniciadas e concluídas e as perguntas feitas à IA, agrupadas por
 * dia. O administrador vê o histórico da empresa inteira, com o nome de quem
 * fez cada interação; os outros perfis, só o próprio.
 */
export function HistoricoPage() {
  const { user } = useAuth()
  const [estado, setEstado] = useState<Estado>(INICIAL)
  const [tentativa, setTentativa] = useState(0)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    const controlador = new AbortController()
    listarHistorico(0, { signal: controlador.signal })
      .then((pagina) => {
        if (!controlador.signal.aborted) {
          setEstado({ ...INICIAL, carregando: false, paginas: [pagina] })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setEstado({
            ...INICIAL,
            carregando: false,
            erro: mensagemDe(causa, 'Não foi possível carregar o histórico.'),
          })
        }
      })
    return () => controlador.abort()
  }, [tentativa])

  const ultima = estado.paginas[estado.paginas.length - 1]
  const temMais =
    ultima !== undefined && ultima.page.number < ultima.page.totalPages - 1

  async function carregarMais() {
    if (!ultima || estado.carregandoMais) {
      return
    }
    setEstado((atual) => ({ ...atual, carregandoMais: true, erroMais: null }))
    try {
      const proxima = await listarHistorico(ultima.page.number + 1)
      setEstado((atual) => ({
        ...atual,
        carregandoMais: false,
        paginas: [...atual.paginas, proxima],
      }))
    } catch (causa) {
      setEstado((atual) => ({
        ...atual,
        carregandoMais: false,
        erroMais: mensagemDe(causa, 'Não foi possível carregar mais.'),
      }))
    }
  }

  const linhas: Linha[] = estado.paginas
    .flatMap((pagina) => pagina.content)
    .map((item) => {
      const { acao, icone, para } = descrever(item)
      const quem =
        item.usuario.id === user?.id ? 'Você' : item.usuario.nomeCompleto
      return {
        id: item.id,
        texto: `${capitalizar(quem)} ${acao}`,
        hora: HORA.format(new Date(item.criadoEm)),
        dia: rotuloDoDia(item.criadoEm),
        icone,
        para,
      }
    })

  const termo = normalizar(busca.trim())
  const filtradas = termo
    ? linhas.filter((linha) => normalizar(linha.texto).includes(termo))
    : linhas
  // A API já devolve do mais recente para o mais antigo: os dias saem em ordem.
  const grupos = filtradas.reduce<Array<{ dia: string; linhas: Linha[] }>>(
    (acc, linha) => {
      const grupo = acc[acc.length - 1]
      if (grupo && grupo.dia === linha.dia) {
        grupo.linhas.push(linha)
      } else {
        acc.push({ dia: linha.dia, linhas: [linha] })
      }
      return acc
    },
    [],
  )

  return (
    <div className={styles.pagina}>
      <div>
        <h1 className={styles.titulo}>Histórico</h1>
        <p className={styles.hint}>
          {user?.papel === 'ADMIN'
            ? 'Interações de todos na plataforma: trilhas e perguntas à IA.'
            : 'Suas interações na plataforma: trilhas e perguntas à IA.'}
        </p>
      </div>

      <div className={styles.busca}>
        <span className={styles.lupa}>
          <IconeBusca />
        </span>
        <label htmlFor="busca-historico" className="visually-hidden">
          Pesquisar no histórico
        </label>
        <input
          id="busca-historico"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar no histórico…"
          disabled={estado.carregando || estado.erro !== null}
        />
      </div>

      {estado.carregando && (
        <p className={styles.vazio} role="status">
          Carregando histórico…
        </p>
      )}

      {estado.erro && (
        <div className={styles.erro} role="alert">
          <p>{estado.erro}</p>
          <button
            type="button"
            onClick={() => {
              setEstado(INICIAL)
              setTentativa((n) => n + 1)
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!estado.carregando && !estado.erro && linhas.length === 0 && (
        <p className={styles.vazio}>
          Nada no histórico ainda. Acessar uma trilha ou perguntar algo à IA já
          aparece aqui.
        </p>
      )}

      {linhas.length > 0 && grupos.length === 0 && (
        <p className={styles.vazio} role="status">
          Nada no histórico corresponde a “{busca.trim()}”.
        </p>
      )}

      {grupos.map((grupo) => (
        <section key={grupo.dia} aria-label={grupo.dia}>
          <h2 className={styles.dia}>{grupo.dia}</h2>
          <ul className={styles.cartao}>
            {grupo.linhas.map((linha) => {
              const conteudo = (
                <>
                  <span className={styles.icone}>{linha.icone}</span>
                  <span className={styles.texto}>{linha.texto}</span>
                  <span className={styles.hora}>{linha.hora}</span>
                </>
              )
              return (
                <li key={linha.id} className={styles.linha}>
                  {linha.para ? (
                    <Link to={linha.para} className={styles.linhaLink}>
                      {conteudo}
                    </Link>
                  ) : (
                    <div className={styles.linhaConteudo}>{conteudo}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {(temMais || estado.erroMais) && (
        <div className={styles.rodape}>
          {estado.erroMais && (
            <p className={styles.erroMais} role="alert">
              {estado.erroMais}
            </p>
          )}
          {temMais && (
            <button
              type="button"
              className={styles.mais}
              onClick={() => void carregarMais()}
              disabled={estado.carregandoMais}
            >
              {estado.carregandoMais ? 'Carregando…' : 'Carregar mais'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
