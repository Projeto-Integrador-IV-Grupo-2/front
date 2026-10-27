import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  criarCategoria,
  criarConteudo,
  criarPagina,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'
import type { User } from '../types/user.ts'

const colaborador = criarUsuario({ papel: 'COLABORADOR' })
const gestor = criarUsuario({ papel: 'GESTOR' })

const manual = criarConteudo({
  id: 'doc-1',
  titulo: 'Manual do colaborador',
  descricao: 'Regras de convivência e benefícios.',
  tipo: 'DOCUMENTO',
  status: 'PUBLICADO',
  categoria: { id: 'cat-1', nome: 'Políticas' },
  area: { id: 'area-1', nome: 'Pessoas' },
  videoUrl: null,
  duracaoSegundos: null,
  miniaturaUrl: null,
  atualizadoEm: '2026-10-05T12:00:00Z',
})

/** Guarda os parâmetros de cada busca em /api/conteudos. */
function registrarBuscas(
  resposta: (url: URL) => Response = () =>
    HttpResponse.json(criarPagina([manual])),
) {
  const buscas: URLSearchParams[] = []
  server.use(
    http.get('*/api/conteudos', ({ request }) => {
      const url = new URL(request.url)
      buscas.push(url.searchParams)
      return resposta(url)
    }),
    http.get('*/api/categorias', () =>
      HttpResponse.json(
        criarPagina([criarCategoria({ id: 'cat-1', nome: 'Políticas' })]),
      ),
    ),
    http.get('*/api/areas', () =>
      HttpResponse.json(criarPagina([{ id: 'area-1', nome: 'Pessoas' }])),
    ),
  )
  return buscas
}

function renderizar(usuario: User) {
  return renderizarComProvedores({ rota: '/conhecimento', usuario })
}

describe('ConhecimentoPage', () => {
  it('lista título, categoria, área, tipo e data de atualização, começando pelos documentos', async () => {
    const buscas = registrarBuscas()

    renderizar(colaborador)

    const linha = (
      await screen.findByRole('rowheader', {
        name: /Manual do colaborador/,
      })
    ).closest('tr') as HTMLElement
    expect(within(linha).getByText('Políticas')).toBeInTheDocument()
    expect(within(linha).getByText('Pessoas')).toBeInTheDocument()
    expect(within(linha).getByText('Documento')).toBeInTheDocument()
    expect(within(linha).getByText('5 de outubro de 2026')).toBeInTheDocument()

    expect(buscas[0].get('tipo')).toBe('DOCUMENTO')
    expect(buscas[0].get('page')).toBe('0')
    expect(screen.getByLabelText('Tipo')).toHaveValue('DOCUMENTO')
  })

  it('colaborador não vê o filtro nem a coluna de status e nunca envia status', async () => {
    const buscas = registrarBuscas()

    renderizar(colaborador)
    await screen.findByRole('rowheader', { name: /Manual do colaborador/ })

    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: 'Status' }),
    ).not.toBeInTheDocument()
    expect(buscas.every((busca) => !busca.has('status'))).toBe(true)
  })

  it('gestor filtra por status', async () => {
    const buscas = registrarBuscas()
    const usuario = userEvent.setup()

    renderizar(gestor)
    await screen.findByRole('rowheader', { name: /Manual do colaborador/ })
    expect(
      screen.getByRole('columnheader', { name: 'Status' }),
    ).toBeInTheDocument()

    await usuario.selectOptions(screen.getByLabelText('Status'), 'Rascunho')

    await waitFor(() =>
      expect(buscas[buscas.length - 1].get('status')).toBe('RASCUNHO'),
    )
  })

  it('os filtros combinam entre si e voltam para a página 1 ao mudar', async () => {
    const buscas = registrarBuscas((url) =>
      HttpResponse.json(
        criarPagina([manual], {
          size: 10,
          number: Number(url.searchParams.get('page')),
          totalElements: 25,
          totalPages: 3,
        }),
      ),
    )
    const usuario = userEvent.setup()

    renderizar(colaborador)
    await screen.findByRole('rowheader', { name: /Manual do colaborador/ })

    await usuario.click(screen.getByRole('button', { name: 'Próxima' }))
    await waitFor(() => expect(buscas[buscas.length - 1].get('page')).toBe('1'))
    await screen.findByText(/Página 2 de 3/)

    await waitFor(() =>
      expect(
        within(screen.getByLabelText('Categoria')).getByRole('option', {
          name: 'Políticas',
        }),
      ).toBeInTheDocument(),
    )
    await usuario.selectOptions(screen.getByLabelText('Categoria'), 'Políticas')
    await waitFor(() =>
      expect(buscas[buscas.length - 1].get('categoriaId')).toBe('cat-1'),
    )
    expect(buscas[buscas.length - 1].get('page')).toBe('0')

    await usuario.selectOptions(screen.getByLabelText('Área'), 'Pessoas')
    await waitFor(() =>
      expect(buscas[buscas.length - 1].get('areaId')).toBe('area-1'),
    )
    const ultima = buscas[buscas.length - 1]
    expect(ultima.get('categoriaId')).toBe('cat-1')
    expect(ultima.get('tipo')).toBe('DOCUMENTO')
    expect(ultima.get('page')).toBe('0')
  })

  it('a busca por título não dispara uma requisição por tecla', async () => {
    const buscas = registrarBuscas()
    const usuario = userEvent.setup()

    renderizar(colaborador)
    await screen.findByRole('rowheader', { name: /Manual do colaborador/ })

    await usuario.type(screen.getByLabelText('Buscar por título'), 'férias')

    await waitFor(() =>
      expect(buscas.map((busca) => busca.get('titulo'))).toContain('férias'),
    )
    // Uma busca ao abrir e uma depois de digitar — nenhuma por tecla.
    expect(buscas.map((busca) => busca.get('titulo'))).toEqual([null, 'férias'])
  })

  it('limpar filtros volta para os documentos, sem outros filtros', async () => {
    const buscas = registrarBuscas()
    const usuario = userEvent.setup()

    renderizar(gestor)
    await screen.findByRole('rowheader', { name: /Manual do colaborador/ })
    expect(
      screen.queryByRole('button', { name: 'Limpar filtros' }),
    ).not.toBeInTheDocument()

    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'Vídeo')
    await usuario.selectOptions(screen.getByLabelText('Status'), 'Publicado')
    await usuario.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    await waitFor(() => {
      const ultima = buscas[buscas.length - 1]
      expect(ultima.get('tipo')).toBe('DOCUMENTO')
      expect(ultima.has('status')).toBe(false)
    })
    expect(screen.getByLabelText('Tipo')).toHaveValue('DOCUMENTO')
  })

  it('lista vazia mostra uma mensagem clara, diferente da de erro', async () => {
    registrarBuscas(() => HttpResponse.json(criarPagina([])))

    renderizar(colaborador)

    expect(
      await screen.findByText('Nenhum documento disponível ainda'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('sem resultado para os filtros, sugere limpar', async () => {
    registrarBuscas((url) =>
      HttpResponse.json(
        criarPagina(url.searchParams.has('areaId') ? [] : [manual]),
      ),
    )
    const usuario = userEvent.setup()

    renderizar(colaborador)
    await screen.findByRole('rowheader', { name: /Manual do colaborador/ })
    await waitFor(() =>
      expect(
        within(screen.getByLabelText('Área')).getByRole('option', {
          name: 'Pessoas',
        }),
      ).toBeInTheDocument(),
    )

    await usuario.selectOptions(screen.getByLabelText('Área'), 'Pessoas')

    expect(
      await screen.findByText('Nenhum documento encontrado com esses filtros'),
    ).toBeInTheDocument()
  })

  it('erro mostra a mensagem e permite tentar de novo', async () => {
    let tentativas = 0
    registrarBuscas(() => {
      tentativas += 1
      return tentativas === 1
        ? new HttpResponse(null, { status: 500 })
        : HttpResponse.json(criarPagina([manual]))
    })
    const usuario = userEvent.setup()

    renderizar(colaborador)

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível carregar os conteúdos.')
    expect(
      screen.queryByText('Nenhum documento disponível ainda'),
    ).not.toBeInTheDocument()

    await usuario.click(
      within(alerta).getByRole('button', { name: 'Tentar novamente' }),
    )

    expect(
      await screen.findByRole('rowheader', { name: /Manual do colaborador/ }),
    ).toBeInTheDocument()
  })

  it.each([['COLABORADOR' as const], ['GESTOR' as const], ['ADMIN' as const]])(
    'o item Conhecimento aparece no menu para %s',
    async (papel) => {
      registrarBuscas()
      const usuario = userEvent.setup()

      renderizarComProvedores({
        rota: '/dashboard',
        usuario: criarUsuario({ papel }),
      })

      await screen.findByRole('link', { name: /Conhecimento/ })
      const menu = document.getElementById('primary-navigation') as HTMLElement
      await usuario.click(
        within(menu).getByRole('link', { name: /Conhecimento/ }),
      )

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Conhecimento' }),
      ).toBeInTheDocument()
    },
  )

  describe('cadastro de documento (issue #49)', () => {
    it('colaborador não vê o botão de novo documento', async () => {
      registrarBuscas()

      renderizar(colaborador)

      await screen.findByRole('heading', { level: 1, name: 'Conhecimento' })
      expect(
        screen.queryByRole('button', { name: '+ Novo documento' }),
      ).not.toBeInTheDocument()
    })

    it('o título do documento leva ao detalhe dele', async () => {
      registrarBuscas()

      renderizar(colaborador)

      expect(
        await screen.findByRole('link', { name: 'Manual do colaborador' }),
      ).toHaveAttribute('href', '/conhecimento/doc-1')
    })

    it('gestor cadastra um documento e o tipo já vem como DOCUMENTO', async () => {
      registrarBuscas()
      const usuario = userEvent.setup()
      let corpo: Record<string, unknown> = {}
      server.use(
        http.post('*/api/conteudos', async ({ request }) => {
          corpo = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(criarConteudo({ tipo: 'DOCUMENTO' }), {
            status: 201,
          })
        }),
      )

      renderizar(gestor)

      await usuario.click(
        await screen.findByRole('button', { name: '+ Novo documento' }),
      )
      const dialogo = await screen.findByRole('dialog', {
        name: 'Novo documento',
      })
      // O select abre no documento: é a tela de Conhecimento.
      expect(within(dialogo).getByLabelText('Tipo')).toHaveValue('DOCUMENTO')
      await usuario.type(
        within(dialogo).getByLabelText('Título'),
        'Política de reembolso',
      )
      await usuario.click(
        within(dialogo).getByRole('button', { name: 'Cadastrar documento' }),
      )

      expect(
        await screen.findByText(/Documento cadastrado como rascunho/),
      ).toBeInTheDocument()
      expect(corpo).toMatchObject({
        titulo: 'Política de reembolso',
        tipo: 'DOCUMENTO',
      })
    })

    /** Abre o cadastro e devolve o diálogo, com o título já preenchido. */
    async function abrirCadastro(usuario: ReturnType<typeof userEvent.setup>) {
      renderizar(gestor)
      await usuario.click(
        await screen.findByRole('button', { name: '+ Novo documento' }),
      )
      const dialogo = await screen.findByRole('dialog', {
        name: 'Novo documento',
      })
      await usuario.type(
        within(dialogo).getByLabelText('Título'),
        'Política de reembolso',
      )
      return dialogo
    }

    it('envia do computador os arquivos escolhidos no cadastro', async () => {
      registrarBuscas()
      const usuario = userEvent.setup()
      const enviados: string[] = []
      server.use(
        http.post('*/api/conteudos', () =>
          HttpResponse.json(criarConteudo({ id: 'doc-novo' }), {
            status: 201,
          }),
        ),
        http.post(
          '*/api/conteudos/:id/arquivos',
          async ({ params, request }) => {
            const arquivo = (await request.formData()).get('arquivo') as File
            // O jsdom perde o nome no FormData; o conteúdo identifica o arquivo.
            enviados.push(`${String(params.id)}:${await arquivo.text()}`)
            return HttpResponse.json({}, { status: 201 })
          },
        ),
      )

      const dialogo = await abrirCadastro(usuario)
      await usuario.upload(
        within(dialogo).getByLabelText('Arquivos do documento'),
        [
          new File(['%PDF'], 'politica.pdf', { type: 'application/pdf' }),
          new File(['# Guia'], 'guia.md', { type: 'text/markdown' }),
        ],
      )
      expect(within(dialogo).getByText('politica.pdf')).toBeInTheDocument()
      await usuario.click(
        within(dialogo).getByRole('button', { name: 'Cadastrar documento' }),
      )

      expect(
        await screen.findByText(
          'Documento cadastrado como rascunho com 2 arquivos.',
        ),
      ).toBeInTheDocument()
      expect(enviados).toEqual(['doc-novo:%PDF', 'doc-novo:# Guia'])
    })

    it('recusa na escolha o arquivo de formato não aceito', async () => {
      registrarBuscas()
      const usuario = userEvent.setup({ applyAccept: false })

      const dialogo = await abrirCadastro(usuario)
      await usuario.upload(
        within(dialogo).getByLabelText('Arquivos do documento'),
        new File(['x'], 'planilha.xlsx'),
      )

      expect(within(dialogo).getByRole('alert')).toHaveTextContent(
        /planilha\.xlsx: Formato não aceito/,
      )
      expect(within(dialogo).queryByText('planilha.xlsx')).toBeNull()
    })

    it('se um envio falha, o documento fica cadastrado e o aviso diz qual arquivo faltou', async () => {
      registrarBuscas()
      const usuario = userEvent.setup()
      server.use(
        http.post('*/api/conteudos', () =>
          HttpResponse.json(criarConteudo({ id: 'doc-novo' }), {
            status: 201,
          }),
        ),
        http.post('*/api/conteudos/:id/arquivos', () =>
          HttpResponse.json(
            { message: 'Arquivo corrompido.' },
            { status: 400 },
          ),
        ),
      )

      const dialogo = await abrirCadastro(usuario)
      await usuario.upload(
        within(dialogo).getByLabelText('Arquivos do documento'),
        new File(['%PDF'], 'politica.pdf', { type: 'application/pdf' }),
      )
      await usuario.click(
        within(dialogo).getByRole('button', { name: 'Cadastrar documento' }),
      )

      expect(
        await screen.findByText(/"politica\.pdf" não foi enviado/),
      ).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('"Cadastrar um link" troca o cadastro para o tipo Link', async () => {
      registrarBuscas()
      const usuario = userEvent.setup()
      let corpo: Record<string, unknown> = {}
      server.use(
        http.post('*/api/conteudos', async ({ request }) => {
          corpo = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(criarConteudo({ tipo: 'LINK' }), {
            status: 201,
          })
        }),
      )

      const dialogo = await abrirCadastro(usuario)
      await usuario.click(
        within(dialogo).getByRole('button', { name: 'Cadastrar um link' }),
      )
      expect(within(dialogo).getByLabelText('Tipo')).toHaveValue('LINK')
      await usuario.type(
        within(dialogo).getByLabelText('Link'),
        'https://intranet.empresa.com/reembolso',
      )
      await usuario.click(
        within(dialogo).getByRole('button', { name: 'Cadastrar documento' }),
      )

      await waitFor(() =>
        expect(corpo).toMatchObject({
          tipo: 'LINK',
          linkUrl: 'https://intranet.empresa.com/reembolso',
        }),
      )
    })
  })
})
