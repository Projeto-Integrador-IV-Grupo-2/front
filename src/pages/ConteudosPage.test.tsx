import { screen, waitFor, within } from '@testing-library/react'
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

    renderizar(criarUsuario({ papel: 'COLABORADOR' }))

    expect(
      await screen.findByRole('heading', { name: 'Boas-vindas' }),
    ).toBeInTheDocument()
    expect(screen.getByText('3 min 05 s')).toBeInTheDocument()
  })

  it('colaborador não vê os botões de criar, editar e publicar', async () => {
    server.use(
      http.get('*/api/conteudos', () =>
        HttpResponse.json(
          criarPagina([criarConteudo({ status: 'PUBLICADO' })]),
        ),
      ),
    )

    renderizar(criarUsuario({ papel: 'COLABORADOR' }))

    await screen.findByRole('heading', { name: 'Boas-vindas' })
    expect(
      screen.queryByRole('button', { name: /novo conteúdo/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /editar/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /publicar/i }),
    ).not.toBeInTheDocument()
  })

  it('gestor publica um rascunho e a lista recarrega', async () => {
    const user = userEvent.setup()
    let publicado = false
    server.use(
      http.get('*/api/conteudos', () =>
        HttpResponse.json(
          criarPagina([
            criarConteudo({ status: publicado ? 'PUBLICADO' : 'RASCUNHO' }),
          ]),
        ),
      ),
      http.patch('*/api/conteudos/:id/publicar', () => {
        publicado = true
        return HttpResponse.json(criarConteudo())
      }),
    )

    renderizar(criarUsuario({ papel: 'GESTOR' }))

    await user.click(
      await screen.findByRole('button', { name: 'Publicar Boas-vindas' }),
    )

    expect(
      await screen.findByText('"Boas-vindas" publicado.'),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Publicar Boas-vindas' }),
      ).not.toBeInTheDocument(),
    )
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

    expect(
      await screen.findByText('Conteúdo cadastrado como rascunho.'),
    ).toBeInTheDocument()
    expect(corpo).toMatchObject({
      tipo: 'TEXTO',
      corpo: 'Seja gentil.',
      videoUrl: null,
    })
  })
})
