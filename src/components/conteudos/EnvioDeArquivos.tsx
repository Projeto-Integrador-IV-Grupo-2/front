import { useState } from 'react'
import {
  ArquivoServiceError,
  enviarArquivo,
} from '../../services/arquivoService.ts'
import type { Arquivo } from '../../types/arquivo.ts'
import { EscolhaDeArquivos } from './EscolhaDeArquivos.tsx'
import styles from './EnvioDeArquivos.module.css'

interface EnvioDeArquivosProps {
  conteudoId: string
  /** Chamado a cada arquivo que a API aceitou, um por vez. */
  onEnviado: (arquivo: Arquivo) => void
}

/**
 * Envio de arquivos com barra de progresso (issue #49).
 *
 * <p>Aceita vários de uma vez e envia um por um, em ordem. A barra se
 * inscreve no progresso de cada upload: o service repassa o
 * `onUploadProgress` do Axios e cada aviso vira um novo valor aqui.</p>
 *
 * <p>Cada escolha <strong>acumula</strong> na lista (com × para tirar), igual
 * ao cadastro: dá para escolher um PDF, depois um DOCX, e salvar tudo junto.
 * Tipo e tamanho são conferidos na escolha (ver EscolhaDeArquivos).</p>
 *
 * <p>Se um envio falhar, a fila para naquele arquivo e o botão vira "Tentar
 * novamente": quem já subiu não sobe de novo, e ninguém precisa reescolher o
 * que faltou.</p>
 */
export function EnvioDeArquivos({
  conteudoId,
  onEnviado,
}: EnvioDeArquivosProps) {
  const [fila, setFila] = useState<File[]>([])
  const [enviando, setEnviando] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [rodada, setRodada] = useState({ atual: 0, total: 0 })
  const [erro, setErro] = useState<string | null>(null)
  const [falhou, setFalhou] = useState(false)

  function alterarFila(arquivos: File[]) {
    setFila(arquivos)
    setFalhou(false)
    setErro(null)
  }

  async function enviar() {
    if (fila.length === 0 || enviando) {
      return
    }
    setEnviando(true)
    setErro(null)
    setFalhou(false)
    const total = fila.length
    let restantes = [...fila]

    for (let posicao = 0; posicao < total; posicao++) {
      setRodada({ atual: posicao + 1, total })
      setProgresso(0)
      try {
        const salvo = await enviarArquivo(conteudoId, restantes[0], {
          onProgresso: setProgresso,
        })
        // Só sai da fila o que a API aceitou: uma falha no meio deixa o
        // arquivo problemático na frente, pronto para a nova tentativa.
        restantes = restantes.slice(1)
        setFila(restantes)
        onEnviado(salvo)
      } catch (causa) {
        setErro(
          causa instanceof ArquivoServiceError
            ? causa.message
            : 'Não foi possível enviar o arquivo.',
        )
        setFalhou(true)
        break
      }
    }

    setEnviando(false)
  }

  function limpar() {
    setFila([])
    setErro(null)
    setFalhou(false)
  }

  const rotuloDoBotao = enviando
    ? 'Enviando…'
    : `${falhou ? 'Tentar novamente' : 'Salvar arquivos'}${
        fila.length > 1 ? ` (${fila.length})` : ''
      }`

  return (
    <div className={styles.envio}>
      {/* Durante o envio a lista some: a barra de progresso diz o que sobe. */}
      {enviando ? null : (
        <EscolhaDeArquivos
          arquivos={fila}
          onAlterar={alterarFila}
          rotulo="Adicionar arquivos"
        />
      )}

      {enviando && (
        <div className={styles.progresso}>
          <progress
            max={100}
            value={progresso}
            aria-label={`Enviando arquivo ${rodada.atual} de ${rodada.total}`}
          />
          <span aria-live="polite">
            {rodada.total > 1
              ? `${rodada.atual} de ${rodada.total} — ${progresso}%`
              : `${progresso}%`}
          </span>
        </div>
      )}

      {erro && (
        <p role="alert" className={styles.erro}>
          {erro}
        </p>
      )}

      <div className={styles.acoes}>
        <button
          type="button"
          className={styles.enviar}
          onClick={() => void enviar()}
          disabled={fila.length === 0 || enviando}
        >
          {rotuloDoBotao}
        </button>
        {fila.length > 0 && !enviando && (
          <button type="button" onClick={limpar}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
