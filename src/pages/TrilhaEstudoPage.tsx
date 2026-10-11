import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatarDuracao } from '../components/conteudos/vimeo.ts'
import { PlayerVimeo } from '../components/estudo/PlayerVimeo.tsx'
import {
  BarraProgresso,
  SeloStatus,
} from '../components/trilhas/StatusProgresso.tsx'
import { caminhoTrilha } from '../routes/paths.ts'
import {
  concluirEtapa,
  EtapaServiceError,
  listarEtapas,
} from '../services/etapaService.ts'
import { buscarTrilha, TrilhaServiceError } from '../services/trilhaService.ts'
import { ROTULOS_TIPO_CONTEUDO } from '../types/conteudo.ts'
import type { Etapa } from '../types/etapa.ts'
import type { ProgressoTrilha, TrilhaDetalhe } from '../types/trilha.ts'
import styles from './TrilhaEstudoPage.module.css'

interface Carregado {
  chave: string
  trilha: TrilhaDetalhe | null
  etapas: Etapa[]
  erro: string | null
}

function mensagemDe(causa: unknown, padrao: string): string {
  if (
    causa instanceof EtapaServiceError ||
    causa instanceof TrilhaServiceError
  ) {
    return causa.message
  }
  return padrao
}

/**
 * Tela de estudo (issue #39): lista de etapas e o material da etapa aberta.
 *
 * Etapa de vídeo se conclui sozinha quando o vídeo termina ou passa de 90%
 * (ver `PlayerVimeo`); as demais têm o botão "Concluir etapa". A resposta da
 * conclusão já traz o progresso recalculado pela API, que entra direto na
 * barra — sem recarregar a página.
 */
export function TrilhaEstudoPage() {
  const { id = '' } = useParams()
  const [recarga, setRecarga] = useState(0)
  const [carregado, setCarregado] = useState<Carregado | null>(null)
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [concluindo, setConcluindo] = useState<string | null>(null)
  const [erroConclusao, setErroConclusao] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  // Estado local depois das conclusões: começa com o que a API mandou.
  const [etapasLocais, setEtapasLocais] = useState<Etapa[] | null>(null)
  const [progressoLocal, setProgressoLocal] = useState<ProgressoTrilha | null>(
    null,
  )

  const chave = `${id}:${recarga}`
  const atual = carregado?.chave === chave ? carregado : null

  useEffect(() => {
    const controlador = new AbortController()
    Promise.all([
      buscarTrilha(id, { signal: controlador.signal }),
      listarEtapas(id, { signal: controlador.signal }),
    ])
      .then(([trilha, etapas]) => {
        if (!controlador.signal.aborted) {
          setCarregado({ chave, trilha, etapas, erro: null })
          setEtapasLocais(etapas)
          setProgressoLocal(trilha.progresso)
          setSelecionada(
            (anterior) =>
              anterior ??
              (etapas.find((etapa) => !etapa.concluida) ?? etapas[0])?.id ??
              null,
          )
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setCarregado({
            chave,
            trilha: null,
            etapas: [],
            erro: mensagemDe(causa, 'Não foi possível abrir a trilha.'),
          })
        }
      })
    return () => controlador.abort()
  }, [id, chave])

  const etapas = etapasLocais ?? atual?.etapas ?? []
  const progresso = progressoLocal ?? atual?.trilha?.progresso ?? null
  const indice = etapas.findIndex((etapa) => etapa.id === selecionada)
  const etapa = indice >= 0 ? etapas[indice] : null
  const proxima = indice >= 0 ? etapas[indice + 1] : undefined

  async function concluir(alvo: Etapa) {
    if (alvo.concluida || concluindo === alvo.id) {
      return
    }
    setConcluindo(alvo.id)
    setErroConclusao(null)
    try {
      const resposta = await concluirEtapa(id, alvo.id)
      setEtapasLocais((lista) =>
        (lista ?? []).map((item) =>
          item.id === resposta.etapaId ? { ...item, concluida: true } : item,
        ),
      )
      setProgressoLocal(resposta.progresso)
      setAviso(
        resposta.progresso.status === 'CONCLUIDA'
          ? 'Parabéns! Você concluiu a trilha.'
          : `Etapa concluída. Progresso: ${resposta.progresso.percentual}%.`,
      )
    } catch (causa) {
      setErroConclusao(mensagemDe(causa, 'Não foi possível concluir a etapa.'))
    } finally {
      setConcluindo(null)
    }
  }

  if (!atual) {
    return (
      <p role="status" className={styles.estado}>
        Carregando trilha…
      </p>
    )
  }

  if (atual.erro || !atual.trilha) {
    return (
      <div className={styles.erro} role="alert">
        <p>{atual.erro}</p>
        <button type="button" onClick={() => setRecarga((valor) => valor + 1)}>
          Tentar novamente
        </button>
      </div>
    )
  }

  const trilha = atual.trilha

  return (
    <div className={styles.page}>
      <Link to={caminhoTrilha(trilha.id)} className={styles.voltar}>
        ← Voltar para a trilha
      </Link>

      <header className={styles.cabecalho}>
        <h1>{trilha.nome}</h1>
        {progresso && (
          <div className={styles.progresso}>
            <div className={styles.progressoTopo}>
              <SeloStatus status={progresso.status} />
              <span className={styles.percentual}>{progresso.percentual}%</span>
            </div>
            <BarraProgresso
              percentual={progresso.percentual}
              rotulo={`Progresso em ${trilha.nome}`}
              semValor
            />
          </div>
        )}
      </header>

      <div role="status" aria-live="polite" className={styles.avisoRegiao}>
        {aviso && <p className={styles.aviso}>{aviso}</p>}
      </div>

      {etapas.length === 0 ? (
        <p className={styles.estado}>Esta trilha ainda não tem etapas.</p>
      ) : (
        <div className={styles.colunas}>
          <nav aria-label="Etapas">
            <ol className={styles.etapas}>
              {etapas.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={
                      item.id === selecionada
                        ? `${styles.etapa} ${styles.etapaAtiva}`
                        : styles.etapa
                    }
                    aria-current={item.id === selecionada ? 'step' : undefined}
                    onClick={() => {
                      setSelecionada(item.id)
                      setErroConclusao(null)
                    }}
                  >
                    <span
                      className={
                        item.concluida
                          ? `${styles.marca} ${styles.marcaFeita}`
                          : styles.marca
                      }
                      aria-hidden="true"
                    >
                      {item.concluida ? '✓' : item.ordem}
                    </span>
                    <span className={styles.etapaTexto}>
                      {item.titulo}
                      <span className={styles.etapaTipo}>
                        {ROTULOS_TIPO_CONTEUDO[item.conteudo.tipo]}
                        {item.concluida && ' · concluída'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          {etapa && (
            <section className={styles.conteudo} aria-labelledby="titulo-etapa">
              <h2 id="titulo-etapa">{etapa.titulo}</h2>
              {etapa.descricao && (
                <p className={styles.hint}>{etapa.descricao}</p>
              )}

              {etapa.conteudo.tipo === 'VIDEO' && etapa.conteudo.videoUrl && (
                <>
                  <PlayerVimeo
                    key={etapa.id}
                    videoUrl={etapa.conteudo.videoUrl}
                    titulo={etapa.titulo}
                    onConcluir={() => void concluir(etapa)}
                  />
                  <p className={styles.hint}>
                    {formatarDuracao(etapa.conteudo.duracaoSegundos) &&
                      `Duração: ${formatarDuracao(etapa.conteudo.duracaoSegundos)}. `}
                    A etapa é concluída sozinha ao terminar o vídeo.
                  </p>
                </>
              )}

              {etapa.conteudo.tipo === 'TEXTO' && (
                <div className={styles.texto}>{etapa.conteudo.corpo}</div>
              )}

              {etapa.conteudo.tipo === 'LINK' && etapa.conteudo.linkUrl && (
                <p>
                  <a
                    href={etapa.conteudo.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir material ({etapa.conteudo.titulo})
                  </a>
                </p>
              )}

              {erroConclusao && (
                <p className={styles.erroTexto} role="alert">
                  {erroConclusao}
                </p>
              )}

              <div className={styles.acoes}>
                {etapa.concluida ? (
                  <span className={styles.feito}>Etapa concluída</span>
                ) : (
                  etapa.conteudo.tipo !== 'VIDEO' && (
                    <button
                      type="button"
                      className={styles.botao}
                      onClick={() => void concluir(etapa)}
                      disabled={concluindo === etapa.id}
                    >
                      {concluindo === etapa.id
                        ? 'Concluindo…'
                        : 'Concluir etapa'}
                    </button>
                  )
                )}
                {proxima && (
                  <button
                    type="button"
                    className={styles.botaoSecundario}
                    onClick={() => setSelecionada(proxima.id)}
                  >
                    Próxima etapa
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
