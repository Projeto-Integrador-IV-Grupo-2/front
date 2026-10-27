import { useState } from 'react'
import {
  ArquivoServiceError,
  baixarArquivo as baixarDaApi,
} from '../../services/arquivoService.ts'
import { baixarArquivo as entregarAoNavegador } from '../../utils/baixarArquivo.ts'
import {
  ROTULOS_TIPO_ARQUIVO,
  formatarTamanho,
  type Arquivo,
} from '../../types/arquivo.ts'
import styles from './ListaDeArquivos.module.css'

interface ListaDeArquivosProps {
  arquivos: Arquivo[]
  /** Arquivo em pré-visualização, para destacar a linha selecionada. */
  selecionadoId: string | null
  onSelecionar: (arquivo: Arquivo) => void
}

/**
 * Arquivos do documento: cada um com tipo, tamanho, botão de download e o
 * clique que abre a pré-visualização.
 *
 * <p>O download entrega o arquivo com o <strong>nome original</strong>: o
 * service lê o `Content-Disposition` da API e o navegador salva com esse
 * nome, não com o id.</p>
 */
export function ListaDeArquivos({
  arquivos,
  selecionadoId,
  onSelecionar,
}: ListaDeArquivosProps) {
  const [baixando, setBaixando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function baixar(arquivo: Arquivo) {
    setBaixando(arquivo.id)
    setErro(null)
    try {
      entregarAoNavegador(await baixarDaApi(arquivo.id, arquivo.nomeOriginal))
    } catch (causa) {
      setErro(
        causa instanceof ArquivoServiceError
          ? causa.message
          : 'Não foi possível baixar o arquivo.',
      )
    } finally {
      setBaixando(null)
    }
  }

  if (arquivos.length === 0) {
    return <p className={styles.vazio}>Nenhum arquivo enviado ainda.</p>
  }

  return (
    <>
      {erro && (
        <p role="alert" className={styles.erro}>
          {erro}
        </p>
      )}
      <ul className={styles.lista}>
        {arquivos.map((arquivo) => (
          <li
            key={arquivo.id}
            className={
              arquivo.id === selecionadoId
                ? `${styles.item} ${styles.itemSelecionado}`
                : styles.item
            }
          >
            <button
              type="button"
              className={styles.abrir}
              onClick={() => onSelecionar(arquivo)}
              aria-label={`Pré-visualizar ${arquivo.nomeOriginal}`}
              aria-pressed={arquivo.id === selecionadoId}
            >
              <span className={styles.nome}>{arquivo.nomeOriginal}</span>
              <span className={styles.meta}>
                {ROTULOS_TIPO_ARQUIVO[arquivo.tipo]} ·{' '}
                {formatarTamanho(arquivo.tamanhoBytes)}
              </span>
            </button>
            <button
              type="button"
              className={styles.baixar}
              onClick={() => void baixar(arquivo)}
              disabled={baixando === arquivo.id}
              aria-label={`Baixar ${arquivo.nomeOriginal}`}
            >
              {baixando === arquivo.id ? 'Baixando…' : 'Baixar'}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
