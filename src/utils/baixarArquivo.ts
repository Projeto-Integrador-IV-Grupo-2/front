import type { ArquivoExportado } from '../types/atribuicao.ts'

/**
 * Entrega ao navegador um arquivo já baixado da API. O link temporário é a
 * forma portátil de disparar o "Salvar como" sem abrir outra aba.
 */
export function baixarArquivo({ conteudo, nome }: ArquivoExportado): void {
  const url = URL.createObjectURL(conteudo)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revogar já no próximo ciclo: alguns navegadores ainda leem a URL depois do click.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
