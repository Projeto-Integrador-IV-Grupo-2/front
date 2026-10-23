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
})
