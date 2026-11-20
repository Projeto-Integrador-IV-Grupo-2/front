import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { caminhoEstudo } from '../../routes/paths.ts'
import {
  concluirEtapa,
  EtapaServiceError,
  listarEtapas,
} from '../../services/etapaService.ts'
import { ROTULOS_TIPO_CONTEUDO } from '../../types/conteudo.ts'
import type { Etapa } from '../../types/etapa.ts'
import type { ProgressoTrilha } from '../../types/trilha.ts'
import styles from './ConteudosDaTrilha.module.css'

interface Carregado {
  trilhaId: string
  etapas: Etapa[] | null
  erro: string | null
}

interface ConteudosDaTrilhaProps {
  trilhaId: string
  /** Só quem recebeu a trilha (e com ela ativa) marca conteúdos como feitos. */
  podeMarcar: boolean
  /** Progresso recalculado pela API depois de cada conteúdo marcado. */
  onProgresso: (progresso: ProgressoTrilha) => void
}

/**
 * Etapas da trilha na visão de quem estuda, cada uma com o seu conteúdo e uma
 * caixa para marcar como feito. Marcar chama a conclusão da etapa na API, que
 * devolve o progresso já recalculado (e inicia a trilha, se ainda não tinha
 * começado). A conclusão não se desfaz: a caixa marcada fica travada.
 */
export function ConteudosDaTrilha({
  trilhaId,
  podeMarcar,
  onProgresso,
}: ConteudosDaTrilhaProps) {
  const [recarga, setRecarga] = useState(0)
  const [carregado, setCarregado] = useState<Carregado | null>(null)
  const [marcando, setMarcando] = useState<string | null>(null)
  const [erroMarcar, setErroMarcar] = useState<string | null>(null)

  useEffect(() => {
    const controlador = new AbortController()
    listarEtapas(trilhaId, { signal: controlador.signal })
      .then((etapas) => {
        if (!controlador.signal.aborted) {
          setCarregado({ trilhaId, etapas, erro: null })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setCarregado({
            trilhaId,
            etapas: null,
            erro:
              causa instanceof EtapaServiceError
                ? causa.message
                : 'Não foi possível carregar os conteúdos da trilha.',
          })
        }
      })
    return () => controlador.abort()
  }, [trilhaId, recarga])

  async function marcar(etapa: Etapa) {
    if (etapa.concluida || marcando) {
      return
    }
    setMarcando(etapa.id)
    setErroMarcar(null)
    try {
      const resposta = await concluirEtapa(trilhaId, etapa.id)
      setCarregado((atual) =>
        atual?.etapas
          ? {
              ...atual,
              etapas: atual.etapas.map((item) =>
                item.id === resposta.etapaId
                  ? { ...item, concluida: true }
                  : item,
              ),
            }
          : atual,
      )
      onProgresso(resposta.progresso)
    } catch (causa) {
      setErroMarcar(
        causa instanceof EtapaServiceError
          ? causa.message
          : 'Não foi possível marcar o conteúdo como feito.',
      )
    } finally {
      setMarcando(null)
    }
  }

  const atual = carregado?.trilhaId === trilhaId ? carregado : null

  if (!atual) {
    return (
      <p role="status" className={styles.estado}>
        Carregando conteúdos…
      </p>
    )
  }

  if (atual.erro || !atual.etapas) {
    return (
      <div className={styles.erro} role="alert">
        <p>{atual.erro}</p>
        <button
          type="button"
          className={styles.tentar}
          onClick={() => setRecarga((valor) => valor + 1)}
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  const etapas = atual.etapas
  if (etapas.length === 0) {
    return <p className={styles.estado}>Esta trilha ainda não tem conteúdos.</p>
  }

  const feitas = etapas.filter((etapa) => etapa.concluida).length

  return (
    <div>
      <p className={styles.contagem}>
        {feitas} de {etapas.length}{' '}
        {etapas.length === 1 ? 'conteúdo feito' : 'conteúdos feitos'}
      </p>

      {erroMarcar && (
        <p className={styles.erroTexto} role="alert">
          {erroMarcar}
        </p>
      )}

      <ol className={styles.lista}>
        {etapas.map((etapa) => {
          const idCaixa = `feito-${etapa.id}`
          return (
            <li
              key={etapa.id}
              className={
                etapa.concluida ? `${styles.item} ${styles.feito}` : styles.item
              }
            >
              <input
                id={idCaixa}
                type="checkbox"
                className={styles.caixa}
                checked={etapa.concluida}
                disabled={!podeMarcar || etapa.concluida || marcando !== null}
                onChange={() => void marcar(etapa)}
                aria-describedby={`${idCaixa}-tipo`}
              />
              <div className={styles.texto}>
                <label htmlFor={idCaixa} className={styles.titulo}>
                  <span className={styles.ordem}>Etapa {etapa.ordem}.</span>{' '}
                  {etapa.titulo}
                </label>
                <span id={`${idCaixa}-tipo`} className={styles.tipo}>
                  {ROTULOS_TIPO_CONTEUDO[etapa.conteudo.tipo]}
                  {etapa.conteudo.titulo !== etapa.titulo &&
                    ` · ${etapa.conteudo.titulo}`}
                  {marcando === etapa.id
                    ? ' · salvando…'
                    : etapa.concluida && ' · feito'}
                </span>
                {etapa.descricao && (
                  <span className={styles.descricao}>{etapa.descricao}</span>
                )}
              </div>
              {podeMarcar && (
                <Link
                  to={`${caminhoEstudo(trilhaId)}?etapa=${encodeURIComponent(etapa.id)}`}
                  className={styles.abrir}
                  aria-label={`Abrir ${etapa.titulo}`}
                >
                  Abrir
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
