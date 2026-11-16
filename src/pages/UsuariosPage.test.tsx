import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  criarPaginaUsuarios,
  criarUsuario,
  criarUsuarioGestao,
} from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

const admin = criarUsuario({ papel: 'ADMIN', nomeCompleto: 'Admin Nexo' })

function renderizarGestao() {
  return renderizarComProvedores({ rota: '/usuarios', usuario: admin })
}

/**
 * Consultas escopadas. "E-mail", "Inativo" e nomes de área aparecem ao mesmo
 * tempo nos filtros, no formulário e na tabela — sem escopo a busca global
 * casaria com o rótulo do filtro em vez do dado da linha.
 */
const tabela = () => within(screen.getByRole('table'))
const painel = (nome: string) =>
  within(screen.getByRole('region', { name: nome }))

/** Editar e desativar ficam no menu de opções (⋯) de cada linha. */
async function escolherOpcao(nome: string, opcao: string) {
  await userEvent.click(
    screen.getByRole('button', { name: `Opções de ${nome}` }),
  )
  await userEvent.click(screen.getByRole('menuitem', { name: opcao }))
}

/** Área é obrigatória no cadastro: escolhe a que vem de GET /api/areas. */
async function escolherArea(novo: ReturnType<typeof within>) {
  const area = novo.getByLabelText('Área')
  await within(area).findByRole('option', { name: 'Tecnologia' })
  await userEvent.selectOptions(area, 'Tecnologia')
}

describe('UsuariosPage', () => {
  it('mostra o carregamento e depois a lista de usuários', async () => {
    server.use(
      http.get('*/api/usuarios', () =>
        HttpResponse.json(
          criarPaginaUsuarios([
            criarUsuarioGestao({ nomeCompleto: 'Ana Souza' }),
            criarUsuarioGestao({
              id: 'id-2',
              nomeCompleto: 'Bruno Lima',
              email: 'bruno@nexo.com',
              situacao: 'INATIVO',
            }),
          ]),
        ),
      ),
    )

    renderizarGestao()

    expect(await screen.findByText('Carregando usuários…')).toBeInTheDocument()

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument()
    expect(tabela().getByText('Bruno Lima')).toBeInTheDocument()
    expect(tabela().getAllByText('Tecnologia')).toHaveLength(2)
    expect(tabela().getByText('Ativo')).toBeInTheDocument()
    expect(tabela().getByText('Inativo')).toBeInTheDocument()
    expect(tabela().getAllByText('Colaborador')).toHaveLength(2)
  })

  it('mostra a lista vazia quando a busca não devolve ninguém', async () => {
    server.use(
      http.get('*/api/usuarios', () =>
        HttpResponse.json(criarPaginaUsuarios([], { totalElements: 0 })),
      ),
    )

    renderizarGestao()

    expect(
      await screen.findByText(
        'Nenhum usuário encontrado com os filtros atuais.',
      ),
    ).toBeInTheDocument()
  })

  it('mostra erro de comunicação e refaz a busca ao tentar novamente', async () => {
    let chamadas = 0
    server.use(
      http.get('*/api/usuarios', () => {
        chamadas += 1
        if (chamadas === 1) {
          return HttpResponse.json(
            { message: 'Serviço indisponível no momento.' },
            { status: 503 },
          )
        }
        return HttpResponse.json(criarPaginaUsuarios())
      }),
    )

    renderizarGestao()

    expect(
      await screen.findByText('Serviço indisponível no momento.'),
    ).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    )

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument()
  })

  it('manda os filtros preenchidos na busca e volta para a primeira página', async () => {
    const urls: URL[] = []
    server.use(
      http.get('*/api/usuarios', ({ request }) => {
        urls.push(new URL(request.url))
        return HttpResponse.json(criarPaginaUsuarios())
      }),
    )

    renderizarGestao()
    await screen.findByText('Ana Souza')

    await userEvent.type(screen.getByLabelText('Nome'), 'bruno')
    await userEvent.selectOptions(screen.getByLabelText('Situação'), 'INATIVO')
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() => expect(urls.length).toBeGreaterThan(1))

    const ultima = urls[urls.length - 1]
    expect(ultima.searchParams.get('nome')).toBe('bruno')
    expect(ultima.searchParams.get('situacao')).toBe('INATIVO')
    expect(ultima.searchParams.get('page')).toBe('0')
    // Campo em branco não vira filtro: `?email=` faria a API buscar string vazia.
    expect(ultima.searchParams.has('email')).toBe(false)
  })

  it('cadastra pela própria tela de gestão e recarrega a lista', async () => {
    let criado = false
    server.use(
      http.get('*/api/usuarios', () =>
        HttpResponse.json(
          criarPaginaUsuarios(
            criado
              ? [
                  criarUsuarioGestao(),
                  criarUsuarioGestao({
                    id: 'id-novo',
                    nomeCompleto: 'Carla Dias',
                    email: 'carla@nexo.com',
                  }),
                ]
              : [criarUsuarioGestao()],
          ),
        ),
      ),
      http.post('*/api/usuarios', async () => {
        criado = true
        return HttpResponse.json(
          criarUsuarioGestao({ id: 'id-novo', nomeCompleto: 'Carla Dias' }),
          { status: 201 },
        )
      }),
    )

    renderizarGestao()
    await screen.findByText('Ana Souza')

    await userEvent.click(screen.getByRole('button', { name: 'Novo usuário' }))

    const novo = painel('Novo usuário')
    await userEvent.type(novo.getByLabelText('Nome completo'), 'Carla Dias')
    await userEvent.type(novo.getByLabelText('E-mail'), 'carla@nexo.com')
    await userEvent.type(novo.getByLabelText('Senha'), 'Senha1234')
    await escolherArea(novo)
    await userEvent.click(novo.getByRole('button', { name: 'Cadastrar' }))

    expect(await screen.findByText('Carla Dias')).toBeInTheDocument()
    expect(screen.getByText('Usuário cadastrado.')).toBeInTheDocument()
    // Painel fechado: o próximo cadastro começa em branco.
    expect(
      screen.queryByRole('region', { name: 'Novo usuário' }),
    ).not.toBeInTheDocument()
  })

  it('mostra a mensagem da API e o erro de campo quando o e-mail já existe', async () => {
    server.use(
      http.post('*/api/usuarios', () =>
        HttpResponse.json(
          {
            message: 'Já existe um usuário com este e-mail.',
            fieldErrors: [{ field: 'email', message: 'e-mail já cadastrado' }],
          },
          { status: 409 },
        ),
      ),
    )

    renderizarGestao()
    await screen.findByText('Ana Souza')

    await userEvent.click(screen.getByRole('button', { name: 'Novo usuário' }))
    const novo = painel('Novo usuário')
    await userEvent.type(novo.getByLabelText('Nome completo'), 'Ana Souza')
    await userEvent.type(novo.getByLabelText('E-mail'), 'ana@nexo.com')
    await userEvent.type(novo.getByLabelText('Senha'), 'Senha1234')
    await escolherArea(novo)
    await userEvent.click(novo.getByRole('button', { name: 'Cadastrar' }))

    expect(
      await screen.findByText('Já existe um usuário com este e-mail.'),
    ).toBeInTheDocument()
    expect(screen.getByText('e-mail já cadastrado')).toBeInTheDocument()
    // O painel continua aberto com o que foi digitado, para corrigir e reenviar.
    expect(painel('Novo usuário').getByLabelText('E-mail')).toHaveValue(
      'ana@nexo.com',
    )
  })

  it('cadastra escolhendo a área na lista e manda a senha sem regra no front', async () => {
    let corpo: Record<string, unknown> | null = null
    server.use(
      http.post('*/api/usuarios', async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          criarUsuarioGestao({ id: 'id-novo', nomeCompleto: 'Carla Dias' }),
          { status: 201 },
        )
      }),
    )

    renderizarGestao()
    await screen.findByText('Ana Souza')
    await userEvent.click(screen.getByRole('button', { name: 'Novo usuário' }))

    const novo = painel('Novo usuário')
    const area = novo.getByLabelText('Área')
    // As opções vêm de GET /api/areas.
    await within(area).findByRole('option', { name: 'Tecnologia' })
    await userEvent.type(novo.getByLabelText('Nome completo'), 'Carla Dias')
    await userEvent.type(novo.getByLabelText('E-mail'), 'carla@nexo.com')
    await userEvent.type(novo.getByLabelText('Senha'), '123')
    await userEvent.selectOptions(area, 'Tecnologia')
    await userEvent.click(novo.getByRole('button', { name: 'Cadastrar' }))

    expect(await screen.findByText('Usuário cadastrado.')).toBeInTheDocument()
    expect(corpo).toMatchObject({
      senha: '123',
      areaId: '33333333-3333-3333-3333-333333333333',
    })
  })

  it('não cadastra sem área nem senha e diz o que falta', async () => {
    let enviou = false
    server.use(
      http.post('*/api/usuarios', () => {
        enviou = true
        return HttpResponse.json(criarUsuarioGestao(), { status: 201 })
      }),
    )

    renderizarGestao()
    await screen.findByText('Ana Souza')
    await userEvent.click(screen.getByRole('button', { name: 'Novo usuário' }))
    const novo = painel('Novo usuário')
    await userEvent.type(novo.getByLabelText('Nome completo'), 'Carla Dias')
    await userEvent.type(novo.getByLabelText('E-mail'), 'carla@nexo.com')
    await userEvent.click(novo.getByRole('button', { name: 'Cadastrar' }))

    expect(await novo.findByText('Selecione a área.')).toBeInTheDocument()
    expect(novo.getByText('Informe a senha.')).toBeInTheDocument()
    expect(enviou).toBe(false)
  })

  it('edita reaproveitando o formulário, sem pedir e-mail nem senha', async () => {
    let corpo: unknown = null
    server.use(
      http.put('*/api/usuarios/:id', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(
          criarUsuarioGestao({
            nomeCompleto: 'Ana Souza Lima',
            papel: 'GESTOR',
          }),
        )
      }),
    )

    renderizarGestao()
    await screen.findByText('Ana Souza')

    await escolherOpcao('Ana Souza', 'Editar')

    const edicao = painel('Editar usuário')
    expect(edicao.getByLabelText('Nome completo')).toHaveValue('Ana Souza')
    expect(edicao.queryByLabelText('E-mail')).not.toBeInTheDocument()
    expect(edicao.queryByLabelText('Senha')).not.toBeInTheDocument()
    expect(edicao.queryByLabelText('Data de entrada')).not.toBeInTheDocument()

    await userEvent.clear(edicao.getByLabelText('Nome completo'))
    await userEvent.type(
      edicao.getByLabelText('Nome completo'),
      'Ana Souza Lima',
    )
    await userEvent.selectOptions(edicao.getByLabelText('Perfil'), 'GESTOR')
    await userEvent.click(edicao.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Usuário atualizado.')).toBeInTheDocument()
    expect(corpo).toEqual({
      nomeCompleto: 'Ana Souza Lima',
      papel: 'GESTOR',
      areaId: '33333333-3333-3333-3333-333333333333',
      cargoId: '22222222-2222-2222-2222-222222222222',
    })
  })

  it('exige confirmação antes de desativar e não chama a API ao cancelar', async () => {
    let patches = 0
    server.use(
      http.patch('*/api/usuarios/:id/situacao', () => {
        patches += 1
        return HttpResponse.json(criarUsuarioGestao({ situacao: 'INATIVO' }))
      }),
    )

    renderizarGestao()
    await screen.findByText('Ana Souza')

    await escolherOpcao('Ana Souza', 'Desativar')

    const dialogo = await screen.findByRole('alertdialog')
    expect(
      within(dialogo).getByText(/perderá o acesso ao sistema/),
    ).toBeInTheDocument()

    await userEvent.click(
      within(dialogo).getByRole('button', { name: 'Cancelar' }),
    )

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(patches).toBe(0)
  })

  it('desativa ao confirmar e reflete a nova situação na lista', async () => {
    let situacao: 'ATIVO' | 'INATIVO' = 'ATIVO'
    server.use(
      http.get('*/api/usuarios', () =>
        HttpResponse.json(
          criarPaginaUsuarios([criarUsuarioGestao({ situacao })]),
        ),
      ),
      http.patch('*/api/usuarios/:id/situacao', () => {
        situacao = 'INATIVO'
        return HttpResponse.json(criarUsuarioGestao({ situacao: 'INATIVO' }))
      }),
    )

    renderizarGestao()
    await screen.findByText('Ana Souza')

    await escolherOpcao('Ana Souza', 'Desativar')
    const dialogo = await screen.findByRole('alertdialog')
    await userEvent.click(
      within(dialogo).getByRole('button', { name: 'Desativar' }),
    )

    expect(await screen.findByText('Usuário desativado.')).toBeInTheDocument()
    expect(tabela().getByText('Inativo')).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Opções de Ana Souza' }),
    )
    expect(
      screen.getByRole('menuitem', { name: 'Reativar' }),
    ).toBeInTheDocument()
  })

  it('pagina a listagem pedindo a página seguinte à API', async () => {
    const paginasPedidas: string[] = []
    server.use(
      http.get('*/api/usuarios', ({ request }) => {
        const pagina = new URL(request.url).searchParams.get('page') ?? '0'
        paginasPedidas.push(pagina)
        return HttpResponse.json(
          criarPaginaUsuarios(
            [
              criarUsuarioGestao({
                nomeCompleto: `Usuário da página ${pagina}`,
              }),
            ],
            { number: Number(pagina), totalPages: 3, totalElements: 25 },
          ),
        )
      }),
    )

    renderizarGestao()
    await screen.findByText('Usuário da página 0')

    expect(screen.getByText(/Página 1 de 3 — 25 usuários/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))

    expect(await screen.findByText('Usuário da página 1')).toBeInTheDocument()
    expect(paginasPedidas).toContain('1')
  })

  it('o menu de opções fecha com Esc e devolve o foco ao botão', async () => {
    renderizarGestao()
    await screen.findByText('Ana Souza')

    const botao = screen.getByRole('button', { name: 'Opções de Ana Souza' })
    await userEvent.click(botao)
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus()
    // As ações não ficam mais soltas na linha.
    expect(
      tabela().queryByRole('button', { name: /^Editar/ }),
    ).not.toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(botao).toHaveFocus()
  })
})
