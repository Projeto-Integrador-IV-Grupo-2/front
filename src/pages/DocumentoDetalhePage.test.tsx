import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DocumentoDetalhePage } from './DocumentoDetalhePage.tsx'
import { ROTAS, caminhoDocumento } from '../routes/paths.ts'
import { criarArquivo, criarConteudo, criarUsuario } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'
import type { User } from '../types/user.ts'

const DOCUMENTO_ID = '77777777-7777-7777-7777-777777777777'

function renderizar(usuario: User) {
  return renderizarComProvedores({
    rota: caminhoDocumento(DOCUMENTO_ID),
    usuario,
    routes: [
      { path: ROTAS.documentoDetalhe, element: <DocumentoDetalhePage /> },
      { path: ROTAS.conhecimento, element: <p>Conhecimento</p> },
    ],
  })
}

function arquivoLocal(nome: string, tipo: string, tamanho = 64): File {
  return new File([new Uint8Array(tamanho)], nome, { type: tipo })
}

/** Espera a tela estar carregada antes de qualquer interação. */
async function tituloCarregado() {
  return screen.findByRole('heading', { name: 'Boas-vindas', level: 1 })
}

describe('DocumentoDetalhePage', () => {
  beforeEach(() => {
    server.use(
      http.get('*/api/conteudos/:id', () =>
        HttpResponse.json(criarConteudo({ tipo: 'DOCUMENTO' })),
      ),
    )
  })

  it('colaborador não vê enviar arquivo, editar nem publicar', async () => {
    server.use(
      http.get('*/api/conteudos/:id/arquivos', () =>
        HttpResponse.json([criarArquivo()]),
      ),
    )

    renderizar(criarUsuario({ papel: 'COLABORADOR' }))

    await tituloCarregado()
    expect(screen.queryByLabelText('Enviar arquivo')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Editar' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /publicar/i }),
    ).not.toBeInTheDocument()
    // Mas continua podendo baixar o que está publicado.
    expect(
      screen.getByRole('button', { name: 'Baixar politica-de-ferias.pdf' }),
    ).toBeInTheDocument()
  })

  it('gestor envia um arquivo e ele entra na lista', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/conteudos/:id/arquivos', () => HttpResponse.json([])),
      http.post('*/api/conteudos/:id/arquivos', async () => {
        await delay(200)
        return HttpResponse.json(criarArquivo(), { status: 201 })
      }),
    )

    renderizar(criarUsuario({ papel: 'GESTOR' }))

    await tituloCarregado()
    expect(
      screen.getByText('Nenhum arquivo enviado ainda.'),
    ).toBeInTheDocument()

    await user.upload(
      screen.getByLabelText('Enviar arquivo'),
      arquivoLocal('politica-de-ferias.pdf', 'application/pdf'),
    )
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    // A barra se inscreve no progresso do upload: ela aparece enquanto envia.
    expect(await screen.findByRole('progressbar')).toBeInTheDocument()

    expect(
      await screen.findByText('"politica-de-ferias.pdf" enviado.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Baixar politica-de-ferias.pdf' }),
    ).toBeInTheDocument()
  })

  it('arquivo de tipo não permitido é recusado antes do envio', async () => {
    // `applyAccept: false` porque o userEvent respeita o atributo `accept` e
    // descartaria o arquivo antes de chegar ao componente — o que o teste
    // quer ver é a validação do front, que também vale para o
    // arrastar-e-soltar e para navegadores que ignoram o `accept`.
    const user = userEvent.setup({ applyAccept: false })
    const enviou = vi.fn()
    server.use(
      http.get('*/api/conteudos/:id/arquivos', () => HttpResponse.json([])),
      http.post('*/api/conteudos/:id/arquivos', () => {
        enviou()
        return HttpResponse.json(criarArquivo(), { status: 201 })
      }),
    )

    renderizar(criarUsuario({ papel: 'ADMIN' }))

    await tituloCarregado()
    await user.upload(
      screen.getByLabelText('Enviar arquivo'),
      arquivoLocal('planilha.xlsx', 'application/vnd.ms-excel'),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Formato não aceito/,
    )
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
    expect(enviou).not.toHaveBeenCalled()
  })

  it('arquivo grande demais é recusado antes do envio, dizendo o limite', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/conteudos/:id/arquivos', () => HttpResponse.json([])),
    )

    renderizar(criarUsuario({ papel: 'ADMIN' }))

    await tituloCarregado()
    await user.upload(
      screen.getByLabelText('Enviar arquivo'),
      arquivoLocal('enorme.pdf', 'application/pdf', 11 * 1024 * 1024),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('10 MB')
  })

  it('falha no meio do upload mostra o erro e deixa tentar de novo sem reescolher', async () => {
    const user = userEvent.setup()
    let tentativas = 0
    server.use(
      http.get('*/api/conteudos/:id/arquivos', () => HttpResponse.json([])),
      http.post('*/api/conteudos/:id/arquivos', () => {
        tentativas += 1
        return tentativas === 1
          ? HttpResponse.json(
              { status: 500, message: 'Falha ao gravar o arquivo' },
              { status: 500 },
            )
          : HttpResponse.json(criarArquivo(), { status: 201 })
      }),
    )

    renderizar(criarUsuario({ papel: 'ADMIN' }))

    await tituloCarregado()
    await user.upload(
      screen.getByLabelText('Enviar arquivo'),
      arquivoLocal('politica-de-ferias.pdf', 'application/pdf'),
    )
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha ao gravar o arquivo',
    )
    // O arquivo escolhido continua lá: basta repetir o envio.
    const repetir = await screen.findByRole('button', {
      name: 'Tentar novamente',
    })
    await user.click(repetir)

    expect(
      await screen.findByText('"politica-de-ferias.pdf" enviado.'),
    ).toBeInTheDocument()
    expect(tentativas).toBe(2)
  })

  it('403 ao enviar mostra a mensagem de permissão', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/conteudos/:id/arquivos', () => HttpResponse.json([])),
      http.post(
        '*/api/conteudos/:id/arquivos',
        () => new HttpResponse(null, { status: 403 }),
      ),
    )

    renderizar(criarUsuario({ papel: 'GESTOR' }))

    await tituloCarregado()
    await user.upload(
      screen.getByLabelText('Enviar arquivo'),
      arquivoLocal('politica.pdf', 'application/pdf'),
    )
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Você não tem permissão para esta operação.',
    )
  })

  it('o download entrega o arquivo com o nome original', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/conteudos/:id/arquivos', () =>
        HttpResponse.json([criarArquivo()]),
      ),
    )
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:arquivo'),
      revokeObjectURL: vi.fn(),
    })
    const clique = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    renderizar(criarUsuario({ papel: 'COLABORADOR' }))

    await tituloCarregado()
    await user.click(
      screen.getByRole('button', { name: 'Baixar politica-de-ferias.pdf' }),
    )

    await waitFor(() => expect(clique).toHaveBeenCalledOnce())
    const link = clique.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe('politica-de-ferias.pdf')
  })

  it('a prévia de texto mostra o conteúdo do arquivo', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/conteudos/:id/arquivos', () =>
        HttpResponse.json([
          criarArquivo({
            nomeOriginal: 'leia-me.md',
            tipo: 'MD',
            mimeType: 'text/markdown',
          }),
        ]),
      ),
      http.get(
        '*/api/arquivos/:id/download',
        () =>
          new HttpResponse('# Política\nTrinta dias de férias.', {
            headers: { 'Content-Type': 'text/markdown' },
          }),
      ),
    )

    renderizar(criarUsuario({ papel: 'COLABORADOR' }))

    await tituloCarregado()
    await user.click(
      screen.getByRole('button', { name: 'Pré-visualizar leia-me.md' }),
    )

    expect(
      await screen.findByText(/Trinta dias de férias\./),
    ).toBeInTheDocument()
  })

  it('formato sem prévia explica que é preciso baixar', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/conteudos/:id/arquivos', () =>
        HttpResponse.json([
          criarArquivo({
            nomeOriginal: 'manual.docx',
            tipo: 'DOCX',
            mimeType:
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        ]),
      ),
    )

    renderizar(criarUsuario({ papel: 'COLABORADOR' }))

    await tituloCarregado()
    await user.click(
      screen.getByRole('button', { name: 'Pré-visualizar manual.docx' }),
    )

    expect(
      await screen.findByText(/não têm pré-visualização aqui/),
    ).toBeInTheDocument()
  })

  it('publicar pede confirmação antes de mudar a situação', async () => {
    const user = userEvent.setup()
    let publicou = false
    server.use(
      http.get('*/api/conteudos/:id', () =>
        HttpResponse.json(
          criarConteudo({
            tipo: 'DOCUMENTO',
            status: publicou ? 'PUBLICADO' : 'RASCUNHO',
          }),
        ),
      ),
      http.get('*/api/conteudos/:id/arquivos', () => HttpResponse.json([])),
      http.patch('*/api/conteudos/:id/publicar', () => {
        publicou = true
        return HttpResponse.json(
          criarConteudo({ tipo: 'DOCUMENTO', status: 'PUBLICADO' }),
        )
      }),
    )

    renderizar(criarUsuario({ papel: 'ADMIN' }))

    await tituloCarregado()
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    const dialogo = await screen.findByRole('dialog', {
      name: 'Publicar documento',
    })
    expect(publicou).toBe(false)
    await user.click(within(dialogo).getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByText('Documento publicado.')).toBeInTheDocument()
    expect(publicou).toBe(true)
    expect(
      await screen.findByRole('button', { name: 'Despublicar' }),
    ).toBeInTheDocument()
  })

  it('despublicar em uso numa trilha mostra o 409 da API', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/conteudos/:id', () =>
        HttpResponse.json(
          criarConteudo({ tipo: 'DOCUMENTO', status: 'PUBLICADO' }),
        ),
      ),
      http.get('*/api/conteudos/:id/arquivos', () => HttpResponse.json([])),
      http.patch('*/api/conteudos/:id/despublicar', () =>
        HttpResponse.json(
          {
            status: 409,
            message: 'Conteúdo usado em etapa de trilha não pode sair do ar',
          },
          { status: 409 },
        ),
      ),
    )

    renderizar(criarUsuario({ papel: 'ADMIN' }))

    await tituloCarregado()
    await user.click(screen.getByRole('button', { name: 'Despublicar' }))
    const dialogo = await screen.findByRole('dialog', {
      name: 'Despublicar documento',
    })
    await user.click(
      within(dialogo).getByRole('button', { name: 'Despublicar' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Conteúdo usado em etapa de trilha não pode sair do ar',
    )
  })

  it('cadastra uma categoria pelo modal do formulário e já a seleciona', async () => {
    const user = userEvent.setup()
    let categoriaIdSalva: unknown = null
    server.use(
      http.get('*/api/conteudos/:id/arquivos', () => HttpResponse.json([])),
      http.post('*/api/categorias', () =>
        HttpResponse.json(
          {
            id: '99999999-9999-9999-9999-999999999999',
            nome: 'Jurídico',
            descricao: null,
            ativo: true,
            criadoEm: '2026-09-01T12:00:00Z',
            atualizadoEm: '2026-09-01T12:00:00Z',
          },
          { status: 201 },
        ),
      ),
      http.put('*/api/conteudos/:id', async ({ request }) => {
        const corpo = (await request.json()) as Record<string, unknown>
        categoriaIdSalva = corpo.categoriaId
        return HttpResponse.json(criarConteudo({ tipo: 'DOCUMENTO' }))
      }),
    )

    renderizar(criarUsuario({ papel: 'ADMIN' }))

    await tituloCarregado()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(
      await screen.findByRole('button', { name: '+ Nova categoria' }),
    )

    const modalCategoria = await screen.findByRole('dialog', {
      name: 'Nova categoria',
    })
    await user.type(within(modalCategoria).getByLabelText('Nome'), 'Jurídico')
    await user.click(
      within(modalCategoria).getByRole('button', {
        name: 'Cadastrar categoria',
      }),
    )

    const modalConteudo = await screen.findByRole('dialog', {
      name: 'Editar documento',
    })
    await waitFor(() =>
      expect(within(modalConteudo).getByLabelText('Categoria')).toHaveValue(
        '99999999-9999-9999-9999-999999999999',
      ),
    )

    await user.click(
      within(modalConteudo).getByRole('button', { name: 'Salvar alterações' }),
    )

    expect(await screen.findByText('Documento atualizado.')).toBeInTheDocument()
    expect(categoriaIdSalva).toBe('99999999-9999-9999-9999-999999999999')
  })

  it('envia vários arquivos de uma vez, um por um', async () => {
    const user = userEvent.setup()
    const enviados: string[] = []
    server.use(
      http.get('*/api/conteudos/:id/arquivos', () => HttpResponse.json([])),
      http.post('*/api/conteudos/:id/arquivos', async ({ request }) => {
        const corpo = await request.formData()
        const enviado = corpo.get('arquivo') as Blob | null
        enviados.push(String(enviado?.size ?? 0))
        return HttpResponse.json(
          criarArquivo({
            id: `arq-${enviados.length}`,
            nomeOriginal: `documento-${enviados.length}.pdf`,
          }),
          { status: 201 },
        )
      }),
    )

    renderizar(criarUsuario({ papel: 'GESTOR' }))

    await tituloCarregado()
    await user.upload(screen.getByLabelText('Enviar arquivo'), [
      arquivoLocal('primeiro.pdf', 'application/pdf', 10),
      arquivoLocal('segundo.md', 'text/markdown', 20),
    ])
    // Os dois entram na fila antes de qualquer envio.
    expect(screen.getByRole('button', { name: 'Enviar (2)' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Enviar (2)' }))

    expect(
      await screen.findByText('"documento-2.pdf" enviado.'),
    ).toBeInTheDocument()
    expect(enviados).toEqual(['10', '20'])
  })

  it('na escolha múltipla, só o arquivo recusado fica de fora', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const enviados: number[] = []
    server.use(
      http.get('*/api/conteudos/:id/arquivos', () => HttpResponse.json([])),
      http.post('*/api/conteudos/:id/arquivos', () => {
        enviados.push(1)
        return HttpResponse.json(criarArquivo(), { status: 201 })
      }),
    )

    renderizar(criarUsuario({ papel: 'ADMIN' }))

    await tituloCarregado()
    await user.upload(screen.getByLabelText('Enviar arquivo'), [
      arquivoLocal('bom.pdf', 'application/pdf'),
      arquivoLocal('planilha.xlsx', 'application/vnd.ms-excel'),
    ])

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /planilha\.xlsx.*Formato não aceito/,
    )
    // Sobrou um só na fila, então o botão não mostra contagem.
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(
      await screen.findByText('"politica-de-ferias.pdf" enviado.'),
    ).toBeInTheDocument()
    expect(enviados).toHaveLength(1)
  })

  it('falha no meio da fila não reenvia o que já subiu', async () => {
    const user = userEvent.setup()
    let tentativas = 0
    server.use(
      http.get('*/api/conteudos/:id/arquivos', () => HttpResponse.json([])),
      http.post('*/api/conteudos/:id/arquivos', async ({ request }) => {
        tentativas += 1
        const corpo = await request.formData()
        const tamanho = (corpo.get('arquivo') as Blob | null)?.size ?? 0
        // O segundo arquivo (20 bytes) falha só na primeira tentativa.
        if (tamanho === 20 && tentativas === 2) {
          return HttpResponse.json(
            { status: 500, message: 'Falha ao gravar o arquivo' },
            { status: 500 },
          )
        }
        return HttpResponse.json(
          criarArquivo({
            id: `arq-${tentativas}`,
            nomeOriginal: `n-${tamanho}.pdf`,
          }),
          { status: 201 },
        )
      }),
    )

    renderizar(criarUsuario({ papel: 'ADMIN' }))

    await tituloCarregado()
    await user.upload(screen.getByLabelText('Enviar arquivo'), [
      arquivoLocal('primeiro.pdf', 'application/pdf', 10),
      arquivoLocal('segundo.pdf', 'application/pdf', 20),
    ])
    await user.click(screen.getByRole('button', { name: 'Enviar (2)' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha ao gravar o arquivo',
    )
    // O primeiro já subiu: sobra um na fila, sem contagem no botão.
    await user.click(
      await screen.findByRole('button', { name: 'Tentar novamente' }),
    )

    expect(await screen.findByText('"n-20.pdf" enviado.')).toBeInTheDocument()
    // Três chamadas no total: dois arquivos + a repetição do que falhou.
    expect(tentativas).toBe(3)
  })
})
