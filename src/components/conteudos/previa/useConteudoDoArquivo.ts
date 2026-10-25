import { useEffect, useState } from 'react'
import {
  ArquivoServiceError,
  baixarArquivo,
} from '../../../services/arquivoService.ts'
import type { Arquivo } from '../../../types/arquivo.ts'

interface ConteudoDoArquivo {
  blob: Blob | null
  carregando: boolean
  erro: string | null
}

interface Resultado {
  /** Arquivo a que este resultado pertence. */
  chave: string
  blob: Blob | null
  erro: string | null
}

/**
 * Baixa o arquivo para a pré-visualização. Usado pelas prévias que precisam
 * do binário (PDF e texto) — o download "salvar como" continua sendo um
 * clique do usuário, em `ListaDeArquivos`.
 *
 * O estado guarda a qual arquivo ele pertence, e não um sinalizador de
 * carregamento: assim trocar de arquivo já mostra "carregando" no mesmo
 * render, sem um `setState` no começo do efeito que renderizaria duas vezes.
 */
export function useConteudoDoArquivo(arquivo: Arquivo): ConteudoDoArquivo {
  const [resultado, setResultado] = useState<Resultado | null>(null)

  useEffect(() => {
    let ativo = true
    baixarArquivo(arquivo.id, arquivo.nomeOriginal)
      .then(({ conteudo }) => {
        if (ativo) {
          setResultado({ chave: arquivo.id, blob: conteudo, erro: null })
        }
      })
      .catch((causa: unknown) => {
        if (ativo) {
          setResultado({
            chave: arquivo.id,
            blob: null,
            erro:
              causa instanceof ArquivoServiceError
                ? causa.message
                : 'Não foi possível abrir a pré-visualização.',
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [arquivo.id, arquivo.nomeOriginal])

  if (resultado?.chave !== arquivo.id) {
    return { blob: null, carregando: true, erro: null }
  }
  return { blob: resultado.blob, carregando: false, erro: resultado.erro }
}
