import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { criarUsuario } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'

const NEXO = {
  id: 'tenant-nexo',
  nome: 'Nexo',
  subdominio: 'nexo',
  cnpj: null,
  ativo: true,
  criadoEm: '2026-01-01T00:00:00Z',
  totalUsuarios: 3,
  plataforma: true,
}

describe('EmpresasPage', () => {
  it('lista as empresas e cadastra uma nova com o administrador', async () => {
    const user = userEvent.setup()
    let corpoRecebido: Record<string, string> | undefined
    server.use(
      http.get('*/api/admin/empresas', () => HttpResponse.json([NEXO])),
      http.post('*/api/admin/empresas', async ({ request }) => {
        corpoRecebido = (await request.json()) as Record<string, string>
        return HttpResponse.json(
          {
            ...NEXO,
            id: 'tenant-vertice',
            nome: corpoRecebido.nome,
            subdominio: corpoRecebido.subdominio,
            totalUsuarios: 1,
            plataforma: false,
          },
          { status: 201 },
        )
      }),
    )

    renderizarComProvedores({
      rota: '/empresas',
      usuario: criarUsuario({ papel: 'ADMIN', plataforma: true }),
    })

    expect(
      await screen.findByRole('heading', { name: 'Nexo' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Empresas' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Nova empresa' }))
    await user.type(
      screen.getByLabelText('Nome da empresa'),
      'Vértice Indústria',
    )
    expect(screen.getByLabelText(/Subdomínio/)).toHaveValue('vertice')
    await user.type(screen.getByLabelText('Nome completo'), 'Mariana Costa')
    await user.type(
      screen.getByLabelText('E-mail de acesso'),
      'admin@vertice.com.br',
    )
    await user.type(screen.getByLabelText(/Senha inicial/), 'Vertice2026')
    await user.click(screen.getByRole('button', { name: 'Cadastrar empresa' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Empresa "Vértice Indústria" cadastrada',
    )
    expect(corpoRecebido).toMatchObject({
      nome: 'Vértice Indústria',
      subdominio: 'vertice',
      emailAdministrador: 'admin@vertice.com.br',
    })
  })

  it('mostra o erro do subdomínio repetido junto do campo', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/admin/empresas', () => HttpResponse.json([NEXO])),
      http.post('*/api/admin/empresas', () =>
        HttpResponse.json(
          {
            message: 'Já existe uma empresa com o subdomínio: nexo',
            status: 400,
            fieldErrors: [
              {
                field: 'subdominio',
                message: 'Já existe uma empresa com o subdomínio: nexo',
              },
            ],
          },
          { status: 400 },
        ),
      ),
    )

    renderizarComProvedores({
      rota: '/empresas',
      usuario: criarUsuario({ papel: 'ADMIN', plataforma: true }),
    })
    await user.click(
      await screen.findByRole('button', { name: '+ Nova empresa' }),
    )
    await user.type(screen.getByLabelText('Nome da empresa'), 'Nexo')
    await user.type(screen.getByLabelText('Nome completo'), 'Fulano')
    await user.type(screen.getByLabelText('E-mail de acesso'), 'f@nexo.com')
    await user.type(screen.getByLabelText(/Senha inicial/), 'Senha1234')
    await user.click(screen.getByRole('button', { name: 'Cadastrar empresa' }))

    expect(
      await screen.findAllByText(
        'Já existe uma empresa com o subdomínio: nexo',
      ),
    ).not.toHaveLength(0)
    expect(screen.getByLabelText(/Subdomínio/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('não mostra Empresas no menu do ADMIN de uma empresa cliente', async () => {
    renderizarComProvedores({
      rota: '/dashboard',
      usuario: criarUsuario({ papel: 'ADMIN', plataforma: false }),
    })
    expect(
      await screen.findByRole('link', { name: 'Usuários' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Empresas' }),
    ).not.toBeInTheDocument()
  })
})
