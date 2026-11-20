import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  criarPagina,
  criarPdiDetalhe,
  criarPdiResumo,
  criarUsuario,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

const colaborador = criarUsuario({ papel: 'COLABORADOR' })
const gestor = criarUsuario({
  id: '00000000-0000-0000-0000-000000000002',
  nomeCompleto: 'Bruno Lima',
  papel: 'GESTOR',
})
const admin = criarUsuario({ papel: 'ADMIN' })

describe('PdiPage — colaborador', () => {
  it('o colaborador não vê o PDI: nem no menu, nem pela URL', async () => {
    renderizarComProvedores({ rota: '/pdi', usuario: colaborador })

    expect(
      await screen.findByRole('heading', { name: 'Acesso negado' }),
    ).toBeInTheDocument()
    const menu = screen.getByRole('navigation')
    expect(
      within(menu).queryByRole('link', { name: 'PDI' }),
    ).not.toBeInTheDocument()
  })

  it('o colaborador também não abre o editor de um PDI', async () => {
    renderizarComProvedores({
      rota: '/pdi/99999999-9999-9999-9999-999999999999',
      usuario: colaborador,
    })

    expect(
      await screen.findByRole('heading', { name: 'Acesso negado' }),
    ).toBeInTheDocument()
  })
})

describe('PdiPage — gestão no menu', () => {
  it('o PDI tem item próprio no menu da gestão', async () => {
    const user = userEvent.setup()
    renderizarComProvedores({ rota: '/trilhas', usuario: gestor })

    const navegacao = await screen.findByRole('navigation')
    const item = within(navegacao).getByRole('link', { name: 'PDI' })
    expect(item).toHaveAttribute('href', '/pdi')
    // O atalho antigo no topo de Trilhas saiu: o menu já leva ao PDI.
    expect(
      screen.queryByRole('link', { name: /Meu PDI/ }),
    ).not.toBeInTheDocument()

    await user.click(item)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'PDI' }),
    ).toBeInTheDocument()
  })
})

describe('PdiPage — PDIs da equipe', () => {
  it('gestor vê a lista com colaborador, ciclo, status e percentual', async () => {
    server.use(
      http.get('*/api/pdis', () =>
        HttpResponse.json(
          criarPagina([
            criarPdiResumo({ percentual: 40 }),
            criarPdiResumo({
              id: 'pdi-2',
              colaborador: { id: 'u-3', nomeCompleto: 'Carla Dias' },
              ciclo: '2025',
              status: 'CONCLUIDO',
              percentual: 100,
            }),
          ]),
        ),
      ),
    )
    renderizarComProvedores({ rota: '/pdi', usuario: gestor })

    // Gestão não tem "Meu PDI": a tela já abre nos PDIs da equipe.
    expect(screen.queryByRole('tab', { name: 'Meu PDI' })).toBeNull()
    const lista = await screen.findByRole('list', { name: 'PDIs da equipe' })
    const linhas = within(lista).getAllByRole('listitem')
    expect(linhas).toHaveLength(2)
    expect(linhas[0]).toHaveTextContent('Ana Souza')
    expect(linhas[0]).toHaveTextContent('Ciclo 2026')
    expect(linhas[0]).toHaveTextContent('Ativo')
    expect(within(linhas[0]).getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '40',
    )
    expect(linhas[1]).toHaveTextContent('Carla Dias')
    expect(linhas[1]).toHaveTextContent('Concluído')
    expect(
      within(linhas[0]).getByRole('link', { name: 'Ana Souza' }),
    ).toHaveAttribute('href', '/pdi/99999999-9999-9999-9999-999999999999')
  })

  it('admin cria um PDI e cai no editor', async () => {
    let corpo: unknown = null
    // O handler padrão de GET /api/pdis/:id já devolve o PDI da Ana para o editor.
    server.use(
      http.post('*/api/pdis', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(criarPdiDetalhe({ id: 'novo', itens: [] }), {
          status: 201,
        })
      }),
    )
    const user = userEvent.setup()

    renderizarComProvedores({ rota: '/pdi?aba=equipe', usuario: admin })

    await user.click(await screen.findByRole('button', { name: 'Novo PDI' }))
    const dialogo = screen.getByRole('dialog', { name: 'Novo PDI' })
    const colaboradorSelect = within(dialogo).getByLabelText('Colaborador')
    await waitFor(() =>
      expect(
        within(colaboradorSelect).getByRole('option', { name: /Ana Souza/ }),
      ).toBeInTheDocument(),
    )
    await user.selectOptions(colaboradorSelect, 'Ana Souza (ana@nexo.com)')
    const ciclo = within(dialogo).getByLabelText('Ciclo')
    await user.clear(ciclo)
    await user.type(ciclo, '2026')
    await user.type(within(dialogo).getByLabelText('Início'), '2026-01-01')
    await user.type(within(dialogo).getByLabelText('Fim'), '2026-12-31')
    await user.click(within(dialogo).getByRole('button', { name: 'Criar PDI' }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'PDI de Ana Souza',
      }),
    ).toBeInTheDocument()
    expect(corpo).toEqual({
      colaboradorId: '00000000-0000-0000-0000-000000000001',
      ciclo: '2026',
      inicio: '2026-01-01',
      fim: '2026-12-31',
    })
  })

  it('PDI repetido no ciclo mostra a mensagem da API', async () => {
    server.use(
      http.post('*/api/pdis', () =>
        HttpResponse.json(
          { message: 'Ana Souza já tem um PDI no ciclo 2026' },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()

    renderizarComProvedores({
      rota: '/pdi?aba=equipe',
      usuario: gestor,
    })

    await user.click(await screen.findByRole('button', { name: 'Novo PDI' }))
    const dialogo = screen.getByRole('dialog', { name: 'Novo PDI' })
    const colaboradorSelect = within(dialogo).getByLabelText('Colaborador')
    await waitFor(() =>
      expect(
        within(colaboradorSelect).getByRole('option', { name: /Ana Souza/ }),
      ).toBeInTheDocument(),
    )
    await user.selectOptions(colaboradorSelect, 'Ana Souza (ana@nexo.com)')
    await user.type(within(dialogo).getByLabelText('Início'), '2026-01-01')
    await user.type(within(dialogo).getByLabelText('Fim'), '2026-12-31')
    await user.click(within(dialogo).getByRole('button', { name: 'Criar PDI' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Ana Souza já tem um PDI no ciclo 2026',
    )
  })

  it('valida os campos antes de enviar', async () => {
    const user = userEvent.setup()

    renderizarComProvedores({
      rota: '/pdi?aba=equipe',
      usuario: gestor,
    })

    await user.click(await screen.findByRole('button', { name: 'Novo PDI' }))
    const dialogo = screen.getByRole('dialog', { name: 'Novo PDI' })
    await user.type(within(dialogo).getByLabelText('Início'), '2026-12-31')
    await user.type(within(dialogo).getByLabelText('Fim'), '2026-01-01')
    await user.click(within(dialogo).getByRole('button', { name: 'Criar PDI' }))

    expect(
      within(dialogo).getByText('Escolha o colaborador.'),
    ).toBeInTheDocument()
    expect(
      within(dialogo).getByText('O fim não pode ser antes do início.'),
    ).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Fim')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })
})
