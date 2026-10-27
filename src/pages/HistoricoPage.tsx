import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  IconeBusca,
  IconeCheck,
  IconeCodigo,
  IconeFaisca,
  IconeLivro,
  IconePlay,
} from '../components/historico/icones.tsx'
import styles from './HistoricoPage.module.css'

interface Atividade {
  texto: string
  hora: string
  icone: ReactNode
  /** Para onde a atividade leva, quando dá para retomá-la. */
  para?: string
}

interface GrupoAtividades {
  dia: string
  atividades: Atividade[]
}

/**
 * Atividades do protótipo, fixas: o backend ainda não registra o histórico de
 * atividades. Quando o endpoint existir, isto vira uma chamada de service.
 */
const GRUPOS: GrupoAtividades[] = [
  {
    dia: 'Hoje',
    atividades: [
      {
        texto: 'Perguntou à IA sobre a política de reembolso',
        hora: '14:22',
        icone: <IconeFaisca tamanho={14} />,
      },
      {
        texto: 'Consultou "Padrões de código e nomenclatura"',
        hora: '11:40',
        icone: <IconeCodigo tamanho={14} />,
      },
      {
        texto: 'Assistiu ao vídeo "Mantendo a calma sob pressão"',
        hora: '11:05',
        icone: <IconePlay tamanho={14} />,
      },
    ],
  },
  {
    dia: 'Ontem',
    atividades: [
      {
        texto: 'Concluiu a avaliação de Fundamentos do Atendimento',
        hora: '17:40',
        icone: <IconeCheck tamanho={14} />,
      },
      {
        texto: 'Consultou "Guia rápido: Política de Reembolso"',
        hora: '09:12',
        icone: <IconeLivro tamanho={14} />,
      },
    ],
  },
]

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Histórico de atividades do usuário na plataforma (protótipo, estático). */
export function HistoricoPage() {
  const [busca, setBusca] = useState('')
  const termo = normalizar(busca.trim())
  const grupos = GRUPOS.map((grupo) => ({
    ...grupo,
    atividades: grupo.atividades.filter((a) =>
      normalizar(a.texto).includes(termo),
    ),
  })).filter((grupo) => grupo.atividades.length > 0)

  return (
    <div className={styles.pagina}>
      <div>
        <h1 className={styles.titulo}>Histórico</h1>
        <p className={styles.hint}>
          Suas interações e atividades na plataforma.
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
        />
      </div>

      {grupos.length === 0 ? (
        <p className={styles.vazio} role="status">
          Nada no histórico corresponde a “{busca.trim()}”.
        </p>
      ) : (
        grupos.map((grupo) => (
          <section key={grupo.dia} aria-labelledby={`dia-${grupo.dia}`}>
            <h2 id={`dia-${grupo.dia}`} className={styles.dia}>
              {grupo.dia}
            </h2>
            <ul className={styles.cartao}>
              {grupo.atividades.map((atividade) => {
                const conteudo = (
                  <>
                    <span className={styles.icone}>{atividade.icone}</span>
                    <span className={styles.texto}>{atividade.texto}</span>
                    <span className={styles.hora}>{atividade.hora}</span>
                  </>
                )
                return (
                  <li key={atividade.texto} className={styles.linha}>
                    {atividade.para ? (
                      <Link to={atividade.para} className={styles.linhaLink}>
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
        ))
      )}
    </div>
  )
}
