import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { AreasPage } from './AreasPage.tsx'
import { criarArea, criarPagina } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'

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

    render(<AreasPage />)

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

    render(<AreasPage />)
    await screen.findByRole('cell', { name: 'Vendas' })

    await user.type(screen.getByLabelText('Buscar área por nome'), 'Vendas')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    await waitFor(() => expect(ultimaUrl).toContain('nome=Vendas'))
  })

  it('exibe mensagem amigável quando a API falha, sem quebrar a tela', async () => {
    server.use(
      http.get('*/api/areas', () => HttpResponse.json(null, { status: 500 })),
    )

    render(<AreasPage />)

    expect(
      await screen.findByText('Não foi possível carregar as áreas.'),
    ).toBeInTheDocument()
  })

  it('exibe estado de lista vazia quando não há áreas', async () => {
    server.use(
      http.get('*/api/areas', () => HttpResponse.json(criarPagina([]))),
    )

    render(<AreasPage />)

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

    render(<AreasPage />)
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

    render(<AreasPage />)
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

    render(<AreasPage />)
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

    render(<AreasPage />)
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

    render(<AreasPage />)
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
})
