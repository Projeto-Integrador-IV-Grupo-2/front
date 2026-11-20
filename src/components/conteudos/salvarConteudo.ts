import {
  ArquivoServiceError,
  enviarArquivo,
} from '../../services/arquivoService.ts'
import {
  criarConteudo,
  publicarConteudo,
} from '../../services/conteudoService.ts'
import type { Conteudo, ConteudoRequest } from '../../types/conteudo.ts'

export interface ResultadoCadastro {
  conteudo: Conteudo
  /** Arquivo que não subiu: o conteúdo existe, o envio pode ser refeito. */
  falha: { arquivo: string; motivo: string } | null
}

/**
 * "Salvar e pronto": cria o conteúdo, envia os arquivos escolhidos do
 * computador e já o deixa visível para os colaboradores — não existe mais o
 * passo de publicar. A publicação vem depois dos arquivos para a IA indexar o
 * documento já com eles.
 *
 * Só o cadastro em si pode falhar com erro (o formulário continua aberto).
 * Depois que o conteúdo existe, uma falha não pode reabrir o cadastro:
 * salvar de novo duplicaria. Ela volta em `falha`.
 */
export async function cadastrarConteudo(
  request: ConteudoRequest,
  arquivos: File[],
): Promise<ResultadoCadastro> {
  const conteudo = await criarConteudo(request)

  let falha: ResultadoCadastro['falha'] = null
  for (const arquivo of arquivos) {
    try {
      await enviarArquivo(conteudo.id, arquivo)
    } catch (causa) {
      falha = {
        arquivo: arquivo.name,
        motivo:
          causa instanceof ArquivoServiceError
            ? causa.message
            : 'Não foi possível enviar o arquivo.',
      }
      break
    }
  }

  try {
    return { conteudo: await publicarConteudo(conteudo.id), falha }
  } catch {
    // Fica como estava; a próxima edição tenta de novo (ver `garantirVisivel`).
    return { conteudo, falha }
  }
}

/** Conteúdo antigo ainda em rascunho fica visível ao ser salvo de novo. */
export async function garantirVisivel(conteudo: Conteudo): Promise<void> {
  if (conteudo.status === 'RASCUNHO') {
    await publicarConteudo(conteudo.id).catch(() => undefined)
  }
}
