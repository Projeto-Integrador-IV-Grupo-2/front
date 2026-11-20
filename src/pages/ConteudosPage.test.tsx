import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ConteudosPage } from './ConteudosPage.tsx'
import { ROTAS } from '../routes/paths.ts'
import { criarConteudo, criarPagina, criarUsuario } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'
import type { User } from '../types/user.ts'

function renderizar(usuario: User) {
  return renderizarComProvedores({
    rota: ROTAS.conteudos,
    usuario,
    routes: [{ path: ROTAS.conteudos, element: <ConteudosPage /> }],
  })
}

describe('ConteudosPage', () => {
  it('lista os conteúdos com duração vinda do Vimeo', async () => {
    server.use(
      http.get('*/api/conteudos', () =>
        HttpResponse.json(criarPagina([criarConteudo()])),
      ),
    )

    renderizar(criarUsuario({ papel: 'GESTOR' }))

    expect(
      await screen.findByRole('heading', { name: 'Boas-vindas' }),
    ).toBeInTheDocument()
    expect(screen.getByText('3 min 05 s')).toBeInTheDocument()
  })

  it('lista só o catálogo das trilhas e cadastra nele, sem paginação', async () => {
    const user = userEvent.setup()
    const catalogos: (string | null)[] = []
    let corpo: Record<string, unknown> = {}
    server.use(
      http.get('*/api/conteudos', ({ request }) => {
        catalogos.push(new URL(request.url).searchParams.get('catalogo'))
        return HttpResponse.json(criarPagina([criarConteudo()]))
      }),
      http.post('*/api/conteudos', async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(criarConteudo({ tipo: 'TEXTO' }), {
          status: 201,
        })
      }),
    )

    renderizar(criarUsuario({ papel: 'ADMIN' }))

    expect(
      await screen.findByRole('heading', { name: 'Conteúdos de trilha' }),
    ).toBeInTheDocument()
    await screen.findByRole('heading', { name: 'Boas-vindas' })
    expect(catalogos.every((catalogo) => catalogo === 'TRILHA')).toBe(true)
    expect(screen.queryByText(/Página \d/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Próxima' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Novo conteúdo' }))
    const dialogo = screen.getByRole('dialog', { name: 'Novo conteúdo' })
    await user.type(within(dialogo).getByLabelText('Título'), 'Regras')
    await user.selectOptions(within(dialogo).getByLabelText('Tipo'), 'TEXTO')
    await user.type(within(dialogo).getByLabelText('Texto'), 'Leia.')
    await user.click(
      within(dialogo).getByRole('button', { name: 'Cadastrar conteúdo' }),
    )

    expect(await screen.findByText('Conteúdo salvo.')).toBeInTheDocument()
    expect(corpo).toMatchObject({ catalogo: 'TRILHA' })
  })

  it('não tem mais o botão de publicar: só lápis e lixeira', async () => {
    server.use(
      http.get('*/api/conteudos', () =>
        HttpResponse.json(criarPagina([criarConteudo({ status: 'RASCUNHO' })])),
      ),
    )

    renderizar(criarUsuario({ papel: 'GESTOR' }))

    expect(
      await screen.findByRole('button', { name: 'Editar Boas-vindas' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Excluir Boas-vindas' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Publicar/ }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Rascunho')).not.toBeInTheDocument()
  })

  it('a lixeira pede confirmação, exclui e a lista recarrega', async () => {
    const user = userEvent.setup()
    let excluido = false
    server.use(
      http.get('*/api/conteudos', () =>
        HttpResponse.json(criarPagina(excluido ? [] : [criarConteudo()])),
      ),
      http.delete('*/api/conteudos/:id', () => {
        excluido = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderizar(criarUsuario({ papel: 'GESTOR' }))

    await user.click(
      await screen.findByRole('button', { name: 'Excluir Boas-vindas' }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Excluir conteúdo' })
    await user.click(within(dialogo).getByRole('button', { name: 'Excluir' }))

    expect(
      await screen.findByText('"Boas-vindas" excluído.'),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('Nenhum conteúdo encontrado.'),
    ).toBeInTheDocument()
  })

  it('conteúdo em etapa de trilha mostra o 409 da API ao excluir', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/conteudos', () =>
        HttpResponse.json(criarPagina([criarConteudo()])),
      ),
      http.delete('*/api/conteudos/:id', () =>
        HttpResponse.json(
          {
            status: 409,
            message:
              'Remova o conteúdo das etapas de trilha antes de excluí-lo: Boas-vindas',
          },
          { status: 409 },
        ),
      ),
    )

    renderizar(criarUsuario({ papel: 'GESTOR' }))

    await user.click(
      await screen.findByRole('button', { name: 'Excluir Boas-vindas' }),
    )
    await user.click(
      within(
        screen.getByRole('dialog', { name: 'Excluir conteúdo' }),
      ).getByRole('button', { name: 'Excluir' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Remova o conteúdo das etapas de trilha',
    )
  })

  it('cadastra um documento com arquivo do computador e já publica', async () => {
    const user = userEvent.setup()
    const passos: string[] = []
    server.use(
      http.post('*/api/conteudos', () => {
        passos.push('criar')
        return HttpResponse.json(
          criarConteudo({ id: 'doc-1', tipo: 'DOCUMENTO', status: 'RASCUNHO' }),
          { status: 201 },
        )
      }),
      http.post('*/api/conteudos/:id/arquivos', ({ params }) => {
        passos.push(`arquivo:${String(params.id)}`)
        return HttpResponse.json({}, { status: 201 })
      }),
      http.patch('*/api/conteudos/:id/publicar', ({ params }) => {
        passos.push(`publicar:${String(params.id)}`)
        return HttpResponse.json(criarConteudo({ status: 'PUBLICADO' }))
      }),
    )

    renderizar(criarUsuario({ papel: 'ADMIN' }))

    await user.click(
      await screen.findByRole('button', { name: '+ Novo conteúdo' }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Novo conteúdo' })
    await user.type(within(dialogo).getByLabelText('Título'), 'Manual')
    await user.selectOptions(
      within(dialogo).getByLabelText('Tipo'),
      'DOCUMENTO',
    )
    await user.upload(
      within(dialogo).getByLabelText('Arquivos do documento'),
      new File(['%PDF'], 'manual.pdf', { type: 'application/pdf' }),
    )
    await user.click(
      within(dialogo).getByRole('button', { name: 'Cadastrar conteúdo' }),
    )

    expect(await screen.findByText('Conteúdo salvo.')).toBeInTheDocument()
    // Os arquivos sobem antes de publicar, para a IA indexar com eles.
    expect(passos).toEqual(['criar', 'arquivo:doc-1', 'publicar:doc-1'])
  })

  it('link inválido do Vimeo mostra a mensagem da API no campo', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/conteudos', () =>
        HttpResponse.json(
          {
            status: 400,
            message: 'Vídeo não encontrado no Vimeo',
            fieldErrors: [
              { field: 'videoUrl', message: 'Vídeo não encontrado no Vimeo' },
            ],
          },
          { status: 400 },
        ),
      ),
    )

    renderizar(criarUsuario({ papel: 'ADMIN' }))

    await user.click(
      await screen.findByRole('button', { name: '+ Novo conteúdo' }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Novo conteúdo' })
    await user.type(within(dialogo).getByLabelText('Título'), 'Vídeo quebrado')
    const campoLink = within(dialogo).getByLabelText('Link do vídeo no Vimeo')
    await user.type(campoLink, 'https://vimeo.com/1')
    await user.click(
      within(dialogo).getByRole('button', { name: 'Cadastrar conteúdo' }),
    )

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Vídeo não encontrado no Vimeo',
    )
    expect(campoLink).toHaveAttribute('aria-invalid', 'true')
  })

  it('cadastra conteúdo de texto enviando só o campo do tipo', async () => {
    const user = userEvent.setup()
    let corpo: Record<string, unknown> = {}
    server.use(
      http.post('*/api/conteudos', async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          criarConteudo({ tipo: 'TEXTO', status: 'RASCUNHO' }),
          { status: 201 },
        )
      }),
    )

    renderizar(criarUsuario({ papel: 'ADMIN' }))

    await user.click(
      await screen.findByRole('button', { name: '+ Novo conteúdo' }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Novo conteúdo' })
    await user.type(
      within(dialogo).getByLabelText('Título'),
      'Código de conduta',
    )
    await user.selectOptions(within(dialogo).getByLabelText('Tipo'), 'TEXTO')
    await user.type(within(dialogo).getByLabelText('Texto'), 'Seja gentil.')
    await user.click(
      within(dialogo).getByRole('button', { name: 'Cadastrar conteúdo' }),
    )

    expect(await screen.findByText('Conteúdo salvo.')).toBeInTheDocument()
    expect(corpo).toMatchObject({
      tipo: 'TEXTO',
      corpo: 'Seja gentil.',
      videoUrl: null,
    })
  })
})
