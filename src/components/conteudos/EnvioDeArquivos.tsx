import { useId, useRef, useState, type ChangeEvent } from 'react'
import {
  ArquivoServiceError,
  enviarArquivo,
  validarArquivo,
} from '../../services/arquivoService.ts'
import {
  ACCEPT_ARQUIVOS,
  FORMATOS_ACEITOS,
  TAMANHO_MAXIMO_BYTES,
  formatarTamanho,
  type Arquivo,
} from '../../types/arquivo.ts'
import styles from './EnvioDeArquivos.module.css'

interface EnvioDeArquivosProps {
  conteudoId: string
  /** Chamado a cada arquivo que a API aceitou, um por vez. */
  onEnviado: (arquivo: Arquivo) => void
}

/** Arquivo recusado na escolha, com o motivo para mostrar ao usuário. */
interface Recusado {
  nome: string
  motivo: string
}

/**
 * Envio de arquivos com barra de progresso (issue #49).
 *
 * <p>Aceita vários de uma vez e envia um por um, em ordem. A barra se
 * inscreve no progresso de cada upload: o service repassa o
 * `onUploadProgress` do Axios e cada aviso vira um novo valor aqui.</p>
 *
 * <p>Tipo e tamanho são conferidos <strong>antes</strong> de enviar — a API
 * também confere, mas recusar na hora poupa o usuário de esperar um upload
 * que vai falhar. Os recusados saem da fila com o motivo ao lado; os demais
 * seguem.</p>
 *
 * <p>Se um envio falhar, a fila para naquele arquivo e o botão vira "Tentar
 * novamente": quem já subiu não sobe de novo, e ninguém precisa reescolher o
 * que faltou.</p>
 */
export function EnvioDeArquivos({
  conteudoId,
  onEnviado,
}: EnvioDeArquivosProps) {
  const campoId = useId()
  const entrada = useRef<HTMLInputElement>(null)
  const [fila, setFila] = useState<File[]>([])
  const [recusados, setRecusados] = useState<Recusado[]>([])
  const [enviando, setEnviando] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [rodada, setRodada] = useState({ atual: 0, total: 0 })
  const [erro, setErro] = useState<string | null>(null)
  const [falhou, setFalhou] = useState(false)

  function escolher(evento: ChangeEvent<HTMLInputElement>) {
    const escolhidos = Array.from(evento.target.files ?? [])
    setFalhou(false)
    setErro(null)
    const aceitos: File[] = []
    const negados: Recusado[] = []
    for (const arquivo of escolhidos) {
      const problema = validarArquivo(arquivo)
      if (problema) {
        negados.push({ nome: arquivo.name, motivo: problema })
      } else {
        aceitos.push(arquivo)
      }
    }
    setFila(aceitos)
    setRecusados(negados)
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
    if (restantes.length === 0) {
      limparEntrada()
    }
  }

  function limpar() {
    setFila([])
    setRecusados([])
    setErro(null)
    setFalhou(false)
    limparEntrada()
  }

  function limparEntrada() {
    if (entrada.current) {
      entrada.current.value = ''
    }
  }

  const rotuloDoBotao = enviando
    ? 'Enviando…'
    : `${falhou ? 'Tentar novamente' : 'Enviar'}${
        fila.length > 1 ? ` (${fila.length})` : ''
      }`

  return (
    <div className={styles.envio}>
      <div className={styles.campo}>
        <label htmlFor={campoId}>Enviar arquivo</label>
        <input
          id={campoId}
          ref={entrada}
          type="file"
          multiple
          accept={ACCEPT_ARQUIVOS}
          onChange={escolher}
          disabled={enviando}
          aria-invalid={recusados.length > 0}
          aria-describedby={`${campoId}-ajuda`}
        />
        <span id={`${campoId}-ajuda`} className={styles.ajuda}>
          {FORMATOS_ACEITOS.map(({ extensao }) => extensao).join(', ')} — até{' '}
          {formatarTamanho(TAMANHO_MAXIMO_BYTES)} cada. Dá para escolher vários.
        </span>
      </div>

      {fila.length > 0 && !enviando && (
        <ul className={styles.fila}>
          {fila.map((arquivo) => (
            <li key={`${arquivo.name}-${arquivo.size}`}>
              {arquivo.name} ({formatarTamanho(arquivo.size)})
            </li>
          ))}
        </ul>
      )}

      {recusados.length > 0 && (
        <ul className={styles.recusados} role="alert">
          {recusados.map((recusado) => (
            <li key={recusado.nome}>
              <strong>{recusado.nome}</strong>: {recusado.motivo}
            </li>
          ))}
        </ul>
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
