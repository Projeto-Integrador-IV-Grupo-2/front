import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { AreasPage } from './AreasPage.tsx'
import { ROTAS } from '../routes/paths.ts'
import {
  criarArea,
  criarPagina,
  criarPaginaTrilhas,
  criarProgressoTrilha,
  criarTrilhaResumo,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'
import type { User } from '../types/user.ts'

/** Por padrão renderiza como ADMIN: a maioria dos testes aqui cobre o fluxo
 * de gestão, que exige perfil. Os testes de controle de acesso passam o
 * usuário explicitamente. */
function renderizar(usuario: User = criarUsuario({ papel: 'ADMIN' })) {
  return renderizarComProvedores({
    rota: ROTAS.areas,
    usuario,
    routes: [{ path: ROTAS.areas, element: <AreasPage /> }],
  })
}

describe('AreasPage', () => {
  it('carrega e lista as áreas vindas da API', async () => {
    server.use(
      http.get('*/api/areas', () =>
        HttpResponse.json(
          criarPagina([
            criarArea({ id: '1', nome: 'Atendimento', totalPessoas: 38 }),
            criarArea({ id: '2', nome: 'Vendas', totalPessoas: 52 }),
          ]),
        ),
      ),
    )

    renderizar()

    expect(
      await screen.findByRole('cell', { name: 'Atendimento' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Vendas' })).toBeInTheDocument()
  })

  it('busca por nome e envia o filtro para a API', async () => {
    const user = userEvent.setup()
    let ultimaUrl = ''
    server.use(
      http.get('*/api/areas', ({ request }) => {
        ultimaUrl = request.url
        return HttpResponse.json(criarPagina([criarArea({ nome: 'Vendas' })]))
      }),
    )

    renderizar()
    await screen.findByRole('cell', { name: 'Vendas' })

    await user.type(screen.getByLabelText('Buscar área por nome'), 'Vendas')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    await waitFor(() => expect(ultimaUrl).toContain('nome=Vendas'))
  })

  it('exibe mensagem amigável quando a API falha, sem quebrar a tela', async () => {
    server.use(
      http.get('*/api/areas', () => HttpResponse.json(null, { status: 500 })),
    )

    renderizar()

    expect(
      await screen.findByText('Não foi possível carregar as áreas.'),
    ).toBeInTheDocument()
  })

  it('exibe estado de lista vazia quando não há áreas', async () => {
    server.use(
      http.get('*/api/areas', () => HttpResponse.json(criarPagina([]))),
    )

    renderizar()

    expect(
      await screen.findByText('Nenhuma área encontrada.'),
    ).toBeInTheDocument()
  })

  it('cadastra uma área nova e reflete na listagem', async () => {
    const user = userEvent.setup()
    let vezes = 0
    server.use(
      http.get('*/api/areas', () => {
        vezes += 1
        const conteudo = vezes === 1 ? [] : [criarArea({ nome: 'Marketing' })]
        return HttpResponse.json(criarPagina(conteudo))
      }),
      http.post('*/api/areas', () =>
        HttpResponse.json(criarArea({ nome: 'Marketing' }), { status: 201 }),
      ),
    )

    renderizar()
    await screen.findByText('Nenhuma área encontrada.')

    await user.click(screen.getByRole('button', { name: '+ Nova área' }))
    await user.type(screen.getByLabelText('Nome da área'), 'Marketing')
    await user.click(screen.getByRole('button', { name: 'Cadastrar área' }))

    expect(await screen.findByText('Área cadastrada.')).toBeInTheDocument()
    expect(
      await screen.findByRole('cell', { name: 'Marketing' }),
    ).toBeInTheDocument()
  })

  it('bloqueia o envio do cadastro sem nome preenchido', async () => {
    const user = userEvent.setup()
    let chamouPost = false
    server.use(
      http.get('*/api/areas', () => HttpResponse.json(criarPagina([]))),
      http.post('*/api/areas', () => {
        chamouPost = true
        return HttpResponse.json(criarArea(), { status: 201 })
      }),
    )

    renderizar()
    await screen.findByText('Nenhuma área encontrada.')

    await user.click(screen.getByRole('button', { name: '+ Nova área' }))
    await user.click(screen.getByRole('button', { name: 'Cadastrar área' }))

    expect(
      await screen.findByText('Informe o nome da área.'),
    ).toBeInTheDocument()
    expect(chamouPost).toBe(false)
  })

  it('exibe o erro de nome duplicado vindo da API, sem quebrar a tela', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/areas', () => HttpResponse.json(criarPagina([]))),
      http.post('*/api/areas', () =>
        HttpResponse.json(
          {
            message: 'Já existe uma área com esse nome.',
            fieldErrors: [
              { field: 'nome', message: 'Já existe uma área com esse nome.' },
            ],
          },
          { status: 400 },
        ),
      ),
    )

    renderizar()
    await screen.findByText('Nenhuma área encontrada.')

    await user.click(screen.getByRole('button', { name: '+ Nova área' }))
    await user.type(screen.getByLabelText('Nome da área'), 'Atendimento')
    await user.click(screen.getByRole('button', { name: 'Cadastrar área' }))

    expect(
      await screen.findAllByText('Já existe uma área com esse nome.'),
    ).not.toHaveLength(0)
  })

  it('edita uma área existente e atualiza os dados na listagem', async () => {
    const user = userEvent.setup()
    let editado = false
    server.use(
      http.get('*/api/areas', () =>
        HttpResponse.json(
          criarPagina([
            criarArea({ id: '1', nome: editado ? 'Suporte' : 'Atendimento' }),
          ]),
        ),
      ),
      http.put('*/api/areas/1', () => {
        editado = true
        return HttpResponse.json(criarArea({ id: '1', nome: 'Suporte' }))
      }),
    )

    renderizar()
    await screen.findByRole('cell', { name: 'Atendimento' })

    await user.click(screen.getByRole('button', { name: 'Editar Atendimento' }))
    const campoNome = screen.getByLabelText('Nome da área')
    await user.clear(campoNome)
    await user.type(campoNome, 'Suporte')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Área atualizada.')).toBeInTheDocument()
    expect(
      await screen.findByRole('cell', { name: 'Suporte' }),
    ).toBeInTheDocument()
  })

  it('inativa uma área ativa a partir da listagem', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/areas', () =>
        HttpResponse.json(
          criarPagina([
            criarArea({ id: '1', nome: 'Atendimento', ativo: true }),
          ]),
        ),
      ),
      http.patch('*/api/areas/1/inativar', () =>
        HttpResponse.json(
          criarArea({ id: '1', nome: 'Atendimento', ativo: false }),
        ),
      ),
    )

    renderizar()
    const linha = (
      await screen.findByRole('cell', { name: 'Atendimento' })
    ).closest('tr')
    if (!linha) {
      throw new Error('Linha da área não encontrada.')
    }

    await user.click(
      within(linha).getByRole('button', { name: 'Inativar Atendimento' }),
    )

    expect(await screen.findByText('Área inativada.')).toBeInTheDocument()
  })

  describe('controle de acesso (Card 14 / issue #31)', () => {
    it('esconde as ações de gestão para o colaborador', async () => {
      server.use(
        http.get('*/api/areas', () =>
          HttpResponse.json(criarPagina([criarArea({ nome: 'Atendimento' })])),
        ),
      )

      renderizar(criarUsuario({ papel: 'COLABORADOR' }))
      await screen.findByRole('cell', { name: 'Atendimento' })

      expect(
        screen.queryByRole('button', { name: '+ Nova área' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Editar Atendimento' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Inativar Atendimento' }),
      ).not.toBeInTheDocument()
    })

    it.each(['ADMIN', 'GESTOR'] as const)(
      'mostra as ações de gestão para %s',
      async (papel) => {
        server.use(
          http.get('*/api/areas', () =>
            HttpResponse.json(
              criarPagina([criarArea({ nome: 'Atendimento' })]),
            ),
          ),
        )

        renderizar(criarUsuario({ papel }))
        await screen.findByRole('cell', { name: 'Atendimento' })

        expect(
          screen.getByRole('button', { name: '+ Nova área' }),
        ).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: 'Editar Atendimento' }),
        ).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: 'Inativar Atendimento' }),
        ).toBeInTheDocument()
      },
    )

    it('trata um 403 do backend de forma amigável, mesmo que a UI já devesse ter escondido a ação', async () => {
      // Defesa em profundidade (padrão obrigatório da issue): mesmo com a UI
      // liberando a ação para este ADMIN, o backend pode recusar (ex.: sessão
      // desatualizada). A tela precisa mostrar o erro, não quebrar.
      const user = userEvent.setup()
      server.use(
        http.get('*/api/areas', () =>
          HttpResponse.json(
            criarPagina([criarArea({ id: '1', nome: 'Atendimento' })]),
          ),
        ),
        http.patch('*/api/areas/1/inativar', () =>
          HttpResponse.json({ message: 'Sem permissão' }, { status: 403 }),
        ),
      )

      renderizar(criarUsuario({ papel: 'ADMIN' }))
      const linha = (
        await screen.findByRole('cell', { name: 'Atendimento' })
      ).closest('tr')
      if (!linha) {
        throw new Error('Linha da área não encontrada.')
      }

      await user.click(
        within(linha).getByRole('button', { name: 'Inativar Atendimento' }),
      )

      expect(await screen.findByText('Sem permissão')).toBeInTheDocument()
    })
  })

  describe('trilhas da área', () => {
    function comUmaArea() {
      server.use(
        http.get('*/api/areas', () =>
          HttpResponse.json(
            criarPagina([criarArea({ id: 'area-1', nome: 'Atendimento' })]),
          ),
        ),
      )
    }

    it('mostra as trilhas da área para qualquer perfil', async () => {
      comUmaArea()
      let areaPedida = ''
      server.use(
        http.get('*/api/areas/:id/trilhas', ({ params }) => {
          areaPedida = String(params.id)
          return HttpResponse.json(
            criarPaginaTrilhas([
              criarTrilhaResumo({
                id: 't-1',
                nome: 'Atendimento ao Cliente',
                progresso: criarProgressoTrilha({ status: 'ATRASADA' }),
              }),
            ]),
          )
        }),
      )
      const user = userEvent.setup()

      renderizar(criarUsuario({ papel: 'COLABORADOR' }))
      const botao = await screen.findByRole('button', {
        name: 'Ver trilhas de Atendimento',
      })
      await user.click(botao)

      const painel = await screen.findByRole('dialog', {
        name: 'Trilhas de Atendimento',
      })
      const link = await within(painel).findByRole('link', {
        name: 'Atendimento ao Cliente',
      })
      expect(link).toHaveAttribute('href', '/trilhas/t-1')
      expect(within(painel).getByText('Atrasada')).toBeInTheDocument()
      expect(areaPedida).toBe('area-1')

      await user.click(within(painel).getByRole('button', { name: 'Fechar' }))
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(botao).toHaveFocus()
    })

    it('avisa quando a área não tem trilhas', async () => {
      comUmaArea()
      server.use(
        http.get('*/api/areas/:id/trilhas', () =>
          HttpResponse.json(criarPaginaTrilhas([])),
        ),
      )
      const user = userEvent.setup()

      renderizar()
      await user.click(
        await screen.findByRole('button', {
          name: 'Ver trilhas de Atendimento',
        }),
      )

      expect(
        await screen.findByText('Nenhuma trilha ativa nesta área.'),
      ).toBeInTheDocument()
    })

    it('mostra o erro e tenta de novo', async () => {
      comUmaArea()
      let chamadas = 0
      server.use(
        http.get('*/api/areas/:id/trilhas', () => {
          chamadas += 1
          return chamadas === 1
            ? HttpResponse.json({ message: 'boom' }, { status: 500 })
            : HttpResponse.json(criarPaginaTrilhas())
        }),
      )
      const user = userEvent.setup()

      renderizar()
      await user.click(
        await screen.findByRole('button', {
          name: 'Ver trilhas de Atendimento',
        }),
      )

      const painel = await screen.findByRole('dialog')
      const alerta = await within(painel).findByRole('alert')
      expect(alerta).toHaveTextContent(
        'O servidor não conseguiu concluir a operação.',
      )
      await user.click(
        within(alerta).getByRole('button', { name: 'Tentar novamente' }),
      )
      expect(
        await within(painel).findByRole('link', { name: 'Onboarding' }),
      ).toBeInTheDocument()
    })
  })
})
