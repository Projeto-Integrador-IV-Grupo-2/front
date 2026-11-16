import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  formatarData,
  formatarInstante,
} from '../components/trilhas/formatacao.ts'
import {
  BarraProgresso,
  SeloStatus,
} from '../components/trilhas/StatusProgresso.tsx'
import { caminhoTrilha } from '../routes/paths.ts'
import {
  AtribuicaoServiceError,
  buscarAtribuicao,
} from '../services/atribuicaoService.ts'
import type { AtribuicaoDetalhe } from '../types/atribuicao.ts'
import { ROTULOS_TIPO_CONTEUDO } from '../types/conteudo.ts'
import { HTTP_STATUS } from '../utils/errorHandler.ts'
import base from './TrilhaDetalhePage.module.css'
import styles from './ColaboradorNaTrilhaPage.module.css'

interface Resultado {
  /** Identifica a busca que produziu este resultado (atribuição + recarga). */
  chave: string
  detalhe: AtribuicaoDetalhe | null
  erro: AtribuicaoServiceError | null
}

/**
 * Andamento de um colaborador numa trilha, aberto pelo "Detalhes" da lista de
 * atribuídos: situação, datas, progresso e cada etapa — o que ele já viu e
 * quando. Só leitura; é de quem acompanha a equipe (ADMIN e GESTOR).
 */
export function ColaboradorNaTrilhaPage() {
  const { id = '', atribuicaoId = '' } = useParams()
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const chave = `${atribuicaoId}:${recarga}`
  const carregando = resultado?.chave !== chave
  const detalhe = resultado?.chave === chave ? resultado.detalhe : null
  const erro = resultado?.chave === chave ? resultado.erro : null

  useEffect(() => {
    const controlador = new AbortController()
    buscarAtribuicao(atribuicaoId, { signal: controlador.signal })
      .then((dados) => {
        if (!controlador.signal.aborted) {
          setResultado({ chave, detalhe: dados, erro: null })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setResultado({
            chave,
            detalhe: null,
            erro:
              causa instanceof AtribuicaoServiceError
                ? causa
                : new AtribuicaoServiceError(
                    'Não foi possível carregar o andamento do colaborador.',
                  ),
          })
        }
      })
    return () => controlador.abort()
  }, [atribuicaoId, chave])

  return (
    <div className={base.page}>
      <Link to={caminhoTrilha(id)} className={base.voltar}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path
            d="M8.5 3L4.5 7l4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Voltar para a trilha
      </Link>

      {carregando && (
        <p role="status" className={styles.carregando}>
          Carregando andamento…
        </p>
      )}

      {erro && (
        <div
          className={
            erro.status === HTTP_STATUS.NOT_FOUND
              ? base.naoEncontrada
              : base.erro
          }
          role="alert"
        >
          <p className={base.erroTitulo}>
            {erro.status === HTTP_STATUS.NOT_FOUND
              ? 'Atribuição não encontrada'
              : 'Não foi possível abrir o andamento'}
          </p>
          <p>
            {erro.status === HTTP_STATUS.NOT_FOUND
              ? 'O colaborador pode não ter mais esta trilha.'
              : erro.message}
          </p>
          {erro.status !== HTTP_STATUS.NOT_FOUND && (
            <button
              type="button"
              className={base.erroAcao}
              onClick={() => setRecarga((atual) => atual + 1)}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {detalhe && <Andamento detalhe={detalhe} />}
    </div>
  )
}

function Andamento({ detalhe }: { detalhe: AtribuicaoDetalhe }) {
  const { atribuicao, etapas, iniciadoEm } = detalhe
  const { colaborador } = atribuicao
  const vistas = etapas.filter((etapa) => etapa.concluida).length
  const atrasada = atribuicao.status === 'ATRASADA'

  return (
    <>
      <header className={base.cabecalho}>
        <div className={base.identificacao}>
          <h1 className={base.titulo}>{colaborador.nomeCompleto}</h1>
          <p className={base.hint}>
            {atribuicao.trilha.nome} · {colaborador.email}
            {atribuicao.area && ` · ${atribuicao.area.nome}`}
          </p>
        </div>
      </header>

      <div className={base.colunas}>
        <section aria-labelledby="titulo-etapas-colaborador">
          <h2 id="titulo-etapas-colaborador" className={base.secao}>
            Etapas ({vistas} de {etapas.length} vistas)
          </h2>
          {etapas.length === 0 ? (
            <div className={base.painel}>
              <p className={styles.vazio}>Esta trilha ainda não tem etapas.</p>
            </div>
          ) : (
            <ol className={`${base.painel} ${styles.etapas}`}>
              {etapas.map((etapa) => (
                <li
                  key={etapa.id}
                  className={`${styles.etapa} ${etapa.concluida ? styles.vista : ''}`}
                >
                  <span className={styles.marca} aria-hidden="true">
                    {etapa.concluida ? '✓' : etapa.ordem}
                  </span>
                  <div className={styles.etapaTexto}>
                    <span className={styles.etapaTitulo}>{etapa.titulo}</span>
                    <span className={styles.etapaMeta}>
                      {ROTULOS_TIPO_CONTEUDO[etapa.conteudo.tipo]} ·{' '}
                      {etapa.conteudo.titulo}
                    </span>
                  </div>
                  <span className={styles.situacaoEtapa}>
                    {etapa.concluida && etapa.concluidaEm
                      ? `Vista em ${formatarInstante(etapa.concluidaEm)}`
                      : etapa.concluida
                        ? 'Vista'
                        : 'Não vista'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className={base.lateral}>
          <section aria-labelledby="titulo-progresso-colaborador">
            <h2 id="titulo-progresso-colaborador" className={base.secao}>
              Progresso
            </h2>
            <div className={base.painel}>
              <div className={base.progressoTopo}>
                <SeloStatus status={atribuicao.status} />
                <span className={base.percentual}>
                  {atribuicao.percentual}%
                </span>
              </div>
              <BarraProgresso
                percentual={atribuicao.percentual}
                rotulo={`Progresso de ${colaborador.nomeCompleto}`}
                semValor
              />
              {atribuicao.prazo && (
                <p
                  className={
                    atrasada
                      ? `${base.prazo} ${base.prazoAtrasado}`
                      : base.prazo
                  }
                >
                  {atrasada ? 'Prazo vencido em ' : 'Prazo: '}
                  {formatarData(atribuicao.prazo)}
                </p>
              )}
            </div>
          </section>

          <section aria-labelledby="titulo-datas-colaborador">
            <h2 id="titulo-datas-colaborador" className={base.secao}>
              Linha do tempo
            </h2>
            <dl className={`${base.painel} ${base.dados}`}>
              <div>
                <dt>Atribuída em</dt>
                <dd>
                  {atribuicao.atribuidoEm
                    ? formatarInstante(atribuicao.atribuidoEm)
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Iniciada em</dt>
                <dd>
                  {iniciadoEm ? formatarInstante(iniciadoEm) : 'Não iniciou'}
                </dd>
              </div>
              <div>
                <dt>Concluída em</dt>
                <dd>
                  {atribuicao.concluidoEm
                    ? formatarInstante(atribuicao.concluidoEm)
                    : 'Não concluiu'}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </>
  )
}
