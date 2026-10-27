import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  ArquivoServiceError,
  baixarArquivo,
  enviarArquivo,
  listarArquivos,
  validarArquivo,
} from './arquivoService.ts'
import { criarArquivo } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { TAMANHO_MAXIMO_BYTES } from '../types/arquivo.ts'

const CONTEUDO_ID = '77777777-7777-7777-7777-777777777777'

function arquivoDe(nome: string, tamanho: number, tipo = ''): File {
  const conteudo = new Uint8Array(tamanho)
  return new File([conteudo], nome, { type: tipo })
}

describe('validarArquivo', () => {
  it('aceita os formatos que a API reconhece', () => {
    expect(validarArquivo(arquivoDe('politica.pdf', 10))).toBeNull()
    expect(validarArquivo(arquivoDe('manual.docx', 10))).toBeNull()
    expect(validarArquivo(arquivoDe('notas.txt', 10))).toBeNull()
    expect(validarArquivo(arquivoDe('leia-me.md', 10))).toBeNull()
  })

  it('aceita pelo mime quando a extensão não ajuda', () => {
    expect(
      validarArquivo(arquivoDe('sem-extensao', 10, 'application/pdf')),
    ).toBeNull()
  })

  it('recusa formato não permitido com mensagem clara', () => {
    expect(validarArquivo(arquivoDe('planilha.xlsx', 10))).toContain(
      'Formato não aceito',
    )
  })

  it('recusa arquivo maior que o limite dizendo o tamanho', () => {
    const mensagem = validarArquivo(
      arquivoDe('grande.pdf', TAMANHO_MAXIMO_BYTES + 1),
    )
    expect(mensagem).toContain('10 MB')
  })

  it('recusa arquivo vazio', () => {
    expect(validarArquivo(arquivoDe('vazio.pdf', 0))).toBe(
      'O arquivo está vazio.',
    )
  })
})

describe('listarArquivos', () => {
  it('devolve os arquivos do conteúdo', async () => {
    server.use(
      http.get('*/api/conteudos/:id/arquivos', () =>
        HttpResponse.json([criarArquivo()]),
      ),
    )

    await expect(listarArquivos(CONTEUDO_ID)).resolves.toHaveLength(1)
  })

  it('403 vira erro com a mensagem de permissão', async () => {
    server.use(
      http.get(
        '*/api/conteudos/:id/arquivos',
        () => new HttpResponse(null, { status: 403 }),
      ),
    )

    await expect(listarArquivos(CONTEUDO_ID)).rejects.toMatchObject({
      name: 'ArquivoServiceError',
      status: 403,
      message: 'Você não tem permissão para esta operação.',
    })
  })
})

describe('enviarArquivo', () => {
  it('manda o arquivo como multipart no campo "arquivo"', async () => {
    let tamanhoRecebido: number | null = null
    server.use(
      http.post('*/api/conteudos/:id/arquivos', async ({ request }) => {
        const corpo = await request.formData()
        // O nome do arquivo não sobrevive à serialização do XHR no jsdom
        // (chega como "blob"), então o que dá para conferir aqui é que o
        // campo certo chegou com o conteúdo certo.
        const enviado = corpo.get('arquivo') as Blob | null
        tamanhoRecebido = enviado?.size ?? null
        return HttpResponse.json(criarArquivo(), { status: 201 })
      }),
    )

    const salvo = await enviarArquivo(
      CONTEUDO_ID,
      arquivoDe('politica-de-ferias.pdf', 128, 'application/pdf'),
    )

    expect(tamanhoRecebido).toBe(128)
    expect(salvo.nomeOriginal).toBe('politica-de-ferias.pdf')
  })

  it('403 vira erro com a mensagem de permissão', async () => {
    server.use(
      http.post(
        '*/api/conteudos/:id/arquivos',
        () => new HttpResponse(null, { status: 403 }),
      ),
    )

    await expect(
      enviarArquivo(CONTEUDO_ID, arquivoDe('politica.pdf', 10)),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('400 da API chega com a mensagem por campo', async () => {
    server.use(
      http.post('*/api/conteudos/:id/arquivos', () =>
        HttpResponse.json(
          {
            status: 400,
            message: 'O arquivo passa do tamanho máximo de 10 MB',
            fieldErrors: [
              {
                field: 'arquivo',
                message: 'O arquivo passa do tamanho máximo de 10 MB',
              },
            ],
          },
          { status: 400 },
        ),
      ),
    )

    await expect(
      enviarArquivo(CONTEUDO_ID, arquivoDe('politica.pdf', 10)),
    ).rejects.toMatchObject({
      status: 400,
      message: 'O arquivo passa do tamanho máximo de 10 MB',
      fieldErrors: [{ field: 'arquivo' }],
    })
  })
})

describe('baixarArquivo', () => {
  it('usa o nome original que vem no Content-Disposition', async () => {
    const baixado = await baixarArquivo('qualquer-id', 'reserva.pdf')

    expect(baixado.nome).toBe('politica-de-ferias.pdf')
    expect(baixado.conteudo).toBeInstanceOf(Blob)
  })

  it('cai no nome de reserva quando o cabeçalho não vem', async () => {
    server.use(
      http.get(
        '*/api/arquivos/:id/download',
        () =>
          new HttpResponse('x', {
            headers: { 'Content-Type': 'application/pdf' },
          }),
      ),
    )

    await expect(baixarArquivo('id', 'reserva.pdf')).resolves.toMatchObject({
      nome: 'reserva.pdf',
    })
  })

  it('lê a mensagem da API mesmo com o erro chegando como Blob', async () => {
    server.use(
      http.get('*/api/arquivos/:id/download', () =>
        HttpResponse.json(
          { status: 404, message: 'Arquivo não encontrado' },
          { status: 404 },
        ),
      ),
    )

    await expect(baixarArquivo('id', 'reserva.pdf')).rejects.toSatisfy(
      (erro: unknown) =>
        erro instanceof ArquivoServiceError &&
        erro.message === 'Arquivo não encontrado',
    )
  })
})
