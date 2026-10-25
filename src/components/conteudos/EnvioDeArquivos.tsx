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
  /** Chamado a cada arquivo que a API aceitou. */
  onEnviado: (arquivo: Arquivo) => void
}

/**
 * Envio de arquivo com barra de progresso (issue #49).
 *
 * <p>A barra se inscreve no progresso do próprio upload: o service repassa o
 * `onUploadProgress` do Axios e cada aviso vira um novo valor aqui.</p>
 *
 * <p>Tipo e tamanho são conferidos <strong>antes</strong> de enviar — a API
 * também confere, mas recusar na hora poupa o usuário de esperar um upload
 * que vai falhar. Se o envio cair no meio, o arquivo escolhido continua
 * selecionado e o botão vira "Tentar novamente": ninguém precisa refazer a
 * escolha.</p>
 */
export function EnvioDeArquivos({
  conteudoId,
  onEnviado,
}: EnvioDeArquivosProps) {
  const campoId = useId()
  const entrada = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [progresso, setProgresso] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [falhou, setFalhou] = useState(false)

  const enviando = progresso !== null

  function escolher(evento: ChangeEvent<HTMLInputElement>) {
    const escolhido = evento.target.files?.[0] ?? null
    setFalhou(false)
    if (!escolhido) {
      setArquivo(null)
      setErro(null)
      return
    }
    const problema = validarArquivo(escolhido)
    setErro(problema)
    // Arquivo recusado não fica selecionado: não há o que enviar.
    setArquivo(problema ? null : escolhido)
  }

  async function enviar() {
    if (!arquivo || enviando) {
      return
    }
    setErro(null)
    setFalhou(false)
    setProgresso(0)
    try {
      const salvo = await enviarArquivo(conteudoId, arquivo, {
        onProgresso: setProgresso,
      })
      limpar()
      onEnviado(salvo)
    } catch (causa) {
      setErro(
        causa instanceof ArquivoServiceError
          ? causa.message
          : 'Não foi possível enviar o arquivo.',
      )
      setFalhou(true)
    } finally {
      setProgresso(null)
    }
  }

  function limpar() {
    setArquivo(null)
    setErro(null)
    setFalhou(false)
    if (entrada.current) {
      entrada.current.value = ''
    }
  }

  return (
    <div className={styles.envio}>
      <div className={styles.campo}>
        <label htmlFor={campoId}>Enviar arquivo</label>
        <input
          id={campoId}
          ref={entrada}
          type="file"
          accept={ACCEPT_ARQUIVOS}
          onChange={escolher}
          disabled={enviando}
          aria-invalid={Boolean(erro)}
          aria-describedby={`${campoId}-ajuda`}
        />
        <span id={`${campoId}-ajuda`} className={styles.ajuda}>
          {FORMATOS_ACEITOS.map(({ extensao }) => extensao).join(', ')} — até{' '}
          {formatarTamanho(TAMANHO_MAXIMO_BYTES)}.
        </span>
      </div>

      {arquivo && !enviando && (
        <p className={styles.selecionado}>
          {arquivo.name} ({formatarTamanho(arquivo.size)})
        </p>
      )}

      {enviando && (
        <div className={styles.progresso}>
          <progress
            max={100}
            value={progresso ?? 0}
            aria-label={`Enviando ${arquivo?.name ?? 'arquivo'}`}
          />
          <span aria-live="polite">{progresso}%</span>
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
          disabled={!arquivo || enviando}
        >
          {enviando ? 'Enviando…' : falhou ? 'Tentar novamente' : 'Enviar'}
        </button>
        {arquivo && !enviando && (
          <button type="button" onClick={limpar}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
