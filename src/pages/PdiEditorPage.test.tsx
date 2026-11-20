import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  criarCompetencia,
  criarPagina,
  criarPaginaTrilhas,
  criarPdiDetalhe,
  criarPdiItem,
  criarTrilhaResumo,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

const gestor = criarUsuario({ papel: 'GESTOR' })
const ROTA = '/pdi/99999999-9999-9999-9999-999999999999'

const LIDERANCA = criarCompetencia({
  id: 'lideranca',
  nome: 'Liderança',
  tipo: 'COMPORTAMENTAL',
})

describe('PdiEditorPage', () => {
  it('colaborador não abre o editor', async () => {
    renderizarComProvedores({
      rota: ROTA,
      usuario: criarUsuario({ papel: 'COLABORADOR' }),
    })

    expect(
      await screen.findByRole('heading', { name: 'Acesso negado' }),
    ).toBeInTheDocument()
  })

  it('níveis só aceitam de 1 a 5 e a competência é enviada com eles', async () => {
    let corpo: unknown = null
    server.use(
      http.get('*/api/competencias', () =>
        HttpResponse.json(criarPagina([criarCompetencia(), LIDERANCA])),
      ),
      http.post('*/api/pdis/:id/itens', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(criarPdiItem({ acoes: [] }), { status: 201 })
      }),
    )
    const user = userEvent.setup()

    renderizarComProvedores({ rota: ROTA, usuario: gestor })

    const form = await screen.findByRole('form', {
      name: 'Adicionar competência',
    })
    const competencia = within(form).getByLabelText('Competência')
    // "Comunicação" já está no PDI: só sobra Liderança.
    await waitFor(() =>
      expect(
        within(competencia).getByRole('option', { name: 'Liderança' }),
      ).toBeInTheDocument(),
    )
    expect(
      within(competencia).queryByRole('option', { name: 'Comunicação' }),
    ).not.toBeInTheDocument()

    const atual = within(form).getByLabelText('Nível atual')
    expect(
      within(atual)
        .getAllByRole('option')
        .map((opcao) => opcao.getAttribute('value'))
        .filter(Boolean),
    ).toEqual(['1', '2', '3', '4', '5'])

    await user.selectOptions(competencia, 'Liderança')
    await user.selectOptions(atual, '1')
    await user.selectOptions(within(form).getByLabelText('Nível alvo'), '3')
    await user.click(
      within(form).getByRole('button', { name: 'Adicionar competência' }),
    )

    await screen.findByText('Competência “Liderança” adicionada.')
    expect(corpo).toEqual({
      competenciaId: 'lideranca',
      nivelAtual: 1,
      nivelAlvo: 3,
      observacao: null,
    })
  })

  it('mostra o erro da API no campo e a competência repetida', async () => {
    server.use(
      http.get('*/api/competencias', () =>
        HttpResponse.json(criarPagina([LIDERANCA])),
      ),
      http.post('*/api/pdis/:id/itens', () =>
        HttpResponse.json(
          {
            message: 'Falha de validação',
            fieldErrors: [
              {
                field: 'nivelAlvo',
                message: 'nível alvo deve estar entre 1 e 5',
              },
            ],
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()

    renderizarComProvedores({ rota: ROTA, usuario: gestor })

    const form = await screen.findByRole('form', {
      name: 'Adicionar competência',
    })
    const competencia = within(form).getByLabelText('Competência')
    await waitFor(() =>
      expect(
        within(competencia).getByRole('option', { name: 'Liderança' }),
      ).toBeInTheDocument(),
    )
    await user.selectOptions(competencia, 'Liderança')
    await user.selectOptions(within(form).getByLabelText('Nível atual'), '2')
    await user.selectOptions(within(form).getByLabelText('Nível alvo'), '4')
    await user.click(
      within(form).getByRole('button', { name: 'Adicionar competência' }),
    )

    expect(
      await within(form).findByText('nível alvo deve estar entre 1 e 5'),
    ).toBeInTheDocument()
    expect(within(form).getByLabelText('Nível alvo')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('cria a competência no diálogo e ela já vem selecionada', async () => {
    let corpo: unknown = null
    server.use(
      http.get('*/api/competencias', () => HttpResponse.json(criarPagina([]))),
      http.post('*/api/competencias', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(LIDERANCA, { status: 201 })
      }),
    )
    const user = userEvent.setup()

    renderizarComProvedores({ rota: ROTA, usuario: gestor })

    const form = await screen.findByRole('form', {
      name: 'Adicionar competência',
    })
    await user.click(
      within(form).getByRole('button', { name: 'Nova competência' }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Nova competência' })
    await user.type(within(dialogo).getByLabelText('Nome'), 'Liderança')
    await user.selectOptions(
      within(dialogo).getByLabelText('Tipo'),
      'Comportamental',
    )
    await user.click(
      within(dialogo).getByRole('button', { name: 'Criar competência' }),
    )

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(corpo).toEqual({
      nome: 'Liderança',
      tipo: 'COMPORTAMENTAL',
      descricao: null,
    })
    expect(within(form).getByLabelText('Competência')).toHaveValue('lideranca')
  })

  it('competência com nome repetido mostra a mensagem da API', async () => {
    server.use(
      http.post('*/api/competencias', () =>
        HttpResponse.json(
          { message: 'Já existe uma competência com o nome: Comunicação' },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()

    renderizarComProvedores({ rota: ROTA, usuario: gestor })

    const form = await screen.findByRole('form', {
      name: 'Adicionar competência',
    })
    await user.click(
      within(form).getByRole('button', { name: 'Nova competência' }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Nova competência' })
    await user.type(within(dialogo).getByLabelText('Nome'), 'Comunicação')
    await user.selectOptions(within(dialogo).getByLabelText('Tipo'), 'Técnica')
    await user.click(
      within(dialogo).getByRole('button', { name: 'Criar competência' }),
    )

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Já existe uma competência com o nome: Comunicação',
    )
  })

  it('liga uma trilha à competência e salva, sem pedir prazo', async () => {
    let corpo: unknown = null
    server.use(
      http.get('*/api/trilhas', () =>
        HttpResponse.json(
          criarPaginaTrilhas([
            criarTrilhaResumo(),
            criarTrilhaResumo({ id: 'vendas', nome: 'Vendas' }),
          ]),
        ),
      ),
      http.post('*/api/pdis/:id/itens/:itemId/acoes', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const user = userEvent.setup()

    renderizarComProvedores({ rota: ROTA, usuario: gestor })

    const form = await screen.findByRole('form', {
      name: 'Ligar trilha a Comunicação',
    })
    const trilha = within(form).getByLabelText('Trilha')
    await waitFor(() =>
      expect(
        within(trilha).getByRole('option', { name: 'Vendas' }),
      ).toBeInTheDocument(),
    )
    // O prazo vem da trilha: o formulário nem pergunta.
    expect(within(form).queryByLabelText('Prazo')).not.toBeInTheDocument()
    const salvar = within(form).getByRole('button', { name: 'Salvar trilha' })
    expect(salvar).toBeDisabled()

    await user.selectOptions(trilha, 'Vendas')
    expect(salvar).toBeEnabled()
    await user.click(salvar)

    expect(
      await screen.findByText(
        'Trilha “Vendas” ligada e atribuída a Ana Souza.',
      ),
    ).toBeInTheDocument()
    expect(corpo).toEqual({ tipo: 'TRILHA', trilhaId: 'vendas' })
  })

  it('o botão "Cadastrar competência" do topo abre o cadastro', async () => {
    const user = userEvent.setup()
    renderizarComProvedores({ rota: ROTA, usuario: gestor })

    await user.click(
      await screen.findByRole('button', { name: '+ Cadastrar competência' }),
    )

    expect(
      await screen.findByRole('dialog', { name: 'Nova competência' }),
    ).toBeInTheDocument()
  })

  it('"Ver trilhas" abre as trilhas do colaborador no painel lateral', async () => {
    const user = userEvent.setup()
    renderizarComProvedores({ rota: ROTA, usuario: gestor })

    await user.click(
      await screen.findByRole('button', { name: 'Ver trilhas de Ana' }),
    )

    const painel = await screen.findByRole('dialog', { name: 'Ana Souza' })
    expect(await within(painel).findByText('Onboarding')).toBeInTheDocument()
  })

  it('PDI fora do alcance mostra que não foi encontrado', async () => {
    server.use(
      http.get('*/api/pdis/:id', () =>
        HttpResponse.json(
          { message: 'PDI não encontrado: x' },
          { status: 404 },
        ),
      ),
    )

    renderizarComProvedores({ rota: ROTA, usuario: gestor })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'PDI não encontrado. Ele pode ter sido removido',
    )
    expect(
      screen.queryByRole('button', { name: 'Tentar novamente' }),
    ).not.toBeInTheDocument()
  })

  it('mostra percentual e dados do PDI', async () => {
    server.use(
      http.get('*/api/pdis/:id', () =>
        HttpResponse.json(
          criarPdiDetalhe({
            percentual: 50,
            totalAcoes: 2,
            acoesConcluidas: 1,
          }),
        ),
      ),
    )

    renderizarComProvedores({ rota: ROTA, usuario: gestor })

    expect(
      await screen.findByRole('progressbar', { name: 'Progresso do PDI 2026' }),
    ).toHaveAttribute('aria-valuenow', '50')
    expect(
      screen.getByText('Progresso médio nas trilhas · 1 de 2 concluídas'),
    ).toBeInTheDocument()
  })
})
