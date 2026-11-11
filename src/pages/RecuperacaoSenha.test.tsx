import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { Outlet, useLocation, type RouteObject } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RotaPublica } from '../components/auth/RotaPublica.tsx'
import { criarUsuario } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'
import { MENSAGEM_ENVIADO } from './EsqueciSenhaPage.tsx'
import { LoginPage } from './LoginPage.tsx'
import { RedefinirSenhaPage } from './RedefinirSenhaPage.tsx'

const TOKEN = 'tok-123_abc'

/** Mostra a URL atual: é por aqui que o teste confere que o token saiu dela. */
function Localizacao() {
  const location = useLocation()
  return (
    <>
      <output data-testid="url">{location.pathname + location.search}</output>
      <Outlet />
    </>
  )
}

const rotasComUrl: RouteObject[] = [
  {
    element: <Localizacao />,
    children: [
      {
        element: <RotaPublica />,
        children: [
          { path: '/redefinir-senha', element: <RedefinirSenhaPage /> },
        ],
      },
      { path: '/login', element: <LoginPage /> },
    ],
  },
]

/** Registra o corpo de cada pedido de redefinição. */
function registrarRedefinicoes(
  resposta: () => Response = () => new HttpResponse(null, { status: 204 }),
) {
  const corpos: unknown[] = []
  server.use(
    http.post('*/api/auth/redefinir-senha', async ({ request }) => {
      corpos.push(await request.json())
      return resposta()
    }),
  )
  return corpos
}

async function preencherSenhas(senha: string, confirmacao = senha) {
  const usuario = userEvent.setup()
  await usuario.type(screen.getByLabelText('Nova senha'), senha)
  await usuario.type(screen.getByLabelText('Confirmar nova senha'), confirmacao)
  await usuario.click(screen.getByRole('button', { name: 'Redefinir senha' }))
  return usuario
}

describe('Esqueci minha senha', () => {
  it('o login leva à tela de esqueci minha senha', async () => {
    const usuario = userEvent.setup()
    renderizarComProvedores({ rota: '/login' })

    await usuario.click(
      await screen.findByRole('link', { name: 'Esqueci minha senha' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Esqueci minha senha' }),
    ).toBeInTheDocument()
  })

  it('mostra a mesma mensagem para e-mail cadastrado e não cadastrado', async () => {
    const emails: unknown[] = []
    server.use(
      http.post('*/api/auth/esqueci-senha', async ({ request }) => {
        emails.push(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
    )

    for (const email of ['ana@nexo.com', 'ninguem@nexo.com']) {
      const usuario = userEvent.setup()
      const { unmount } = renderizarComProvedores({ rota: '/esqueci-senha' })
      await usuario.type(await screen.findByLabelText('E-mail'), email)
      await usuario.click(screen.getByRole('button', { name: 'Enviar link' }))

      expect(await screen.findByRole('status')).toHaveTextContent(
        MENSAGEM_ENVIADO,
      )
      expect(
        screen.getByRole('link', { name: 'Voltar ao login' }),
      ).toHaveAttribute('href', '/login')
      unmount()
    }
    expect(emails).toEqual([
      { email: 'ana@nexo.com' },
      { email: 'ninguem@nexo.com' },
    ])
  })

  it('desabilita o botão durante o envio, para não mandar duas vezes', async () => {
    let pedidos = 0
    server.use(
      http.post('*/api/auth/esqueci-senha', async () => {
        pedidos += 1
        await delay(200)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const usuario = userEvent.setup()
    renderizarComProvedores({ rota: '/esqueci-senha' })

    await usuario.type(await screen.findByLabelText('E-mail'), 'ana@nexo.com')
    await usuario.click(screen.getByRole('button', { name: 'Enviar link' }))

    const botao = screen.getByRole('button', { name: 'Enviando…' })
    expect(botao).toBeDisabled()
    await usuario.click(botao)
    await screen.findByText(MENSAGEM_ENVIADO, { exact: false })
    expect(pedidos).toBe(1)
  })

  it('limite de pedidos (429) mostra a mensagem e não a de enviado', async () => {
    server.use(
      http.post('*/api/auth/esqueci-senha', () =>
        HttpResponse.json(
          { message: 'Muitos pedidos de redefinição de senha.' },
          { status: 429, headers: { 'Retry-After': '900' } },
        ),
      ),
    )
    const usuario = userEvent.setup()
    renderizarComProvedores({ rota: '/esqueci-senha' })

    await usuario.type(await screen.findByLabelText('E-mail'), 'ana@nexo.com')
    await usuario.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Você fez muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.',
    )
    expect(screen.queryByText(MENSAGEM_ENVIADO, { exact: false })).toBeNull()
    expect(screen.getByRole('button', { name: 'Enviar link' })).toBeEnabled()
  })

  it('e-mail inválido não chama a API', async () => {
    let pedidos = 0
    server.use(
      http.post('*/api/auth/esqueci-senha', () => {
        pedidos += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const usuario = userEvent.setup()
    renderizarComProvedores({ rota: '/esqueci-senha' })

    await usuario.type(await screen.findByLabelText('E-mail'), 'nao-e-email')
    await usuario.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(pedidos).toBe(0)
  })
})

describe('Redefinir senha', () => {
  it('mantém o token na URL para permitir recarregar e voltar à página', async () => {
    renderizarComProvedores({
      rota: `/redefinir-senha?token=${TOKEN}`,
      routes: rotasComUrl,
    })

    await screen.findByRole('heading', { name: 'Criar nova senha' })
    expect(screen.getByTestId('url')).toHaveTextContent(
      new RegExp(`^/redefinir-senha\\?token=${TOKEN}$`),
    )
    expect(window.localStorage.getItem('token')).toBeNull()
    expect(JSON.stringify(window.localStorage)).not.toContain(TOKEN)
  })

  it('mostra as regras da senha enquanto a pessoa digita', async () => {
    const usuario = userEvent.setup()
    renderizarComProvedores({ rota: `/redefinir-senha?token=${TOKEN}` })

    const regras = await screen.findByRole('list', { name: 'Regras da senha' })
    expect(within(regras).getByText(/Ao menos 8 caracteres/)).toHaveTextContent(
      '(pendente)',
    )

    await usuario.type(screen.getByLabelText('Nova senha'), 'abcdefgH1')

    for (const regra of [
      /Ao menos 8 caracteres/,
      /Uma letra maiúscula/,
      /Uma letra minúscula/,
      /Um número/,
    ]) {
      expect(within(regras).getByText(regra)).toHaveTextContent('(atendida)')
    }
  })

  it('senhas diferentes ou fora da regra não chamam a API', async () => {
    const corpos = registrarRedefinicoes()
    renderizarComProvedores({ rota: `/redefinir-senha?token=${TOKEN}` })
    await screen.findByRole('heading', { name: 'Criar nova senha' })

    const usuario = await preencherSenhas('NovaSenha1', 'OutraSenha1')
    expect(screen.getByText('As senhas não são iguais.')).toBeInTheDocument()

    await usuario.clear(screen.getByLabelText('Nova senha'))
    await usuario.clear(screen.getByLabelText('Confirmar nova senha'))
    await preencherSenhas('fraca')
    expect(
      screen.getByText('A senha ainda não atende a todas as regras.'),
    ).toBeInTheDocument()
    expect(corpos).toEqual([])
  })

  it('redefine e leva ao login com a mensagem de sucesso', async () => {
    const corpos = registrarRedefinicoes()
    renderizarComProvedores({
      rota: `/redefinir-senha?token=${TOKEN}`,
      routes: rotasComUrl,
    })
    await screen.findByRole('heading', { name: 'Criar nova senha' })

    await preencherSenhas('NovaSenha1')

    expect(
      await screen.findByText('Senha redefinida. Entre com a nova senha.'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('url')).toHaveTextContent(/^\/login$/)
    expect(corpos).toEqual([{ token: TOKEN, novaSenha: 'NovaSenha1' }])
  })

  it('link inválido ou expirado mostra a mensagem e o caminho para pedir outro', async () => {
    registrarRedefinicoes(() =>
      HttpResponse.json(
        {
          message:
            'Este link de redefinição é inválido ou expirou. Peça um novo link.',
          fieldErrors: [],
        },
        { status: 400 },
      ),
    )
    renderizarComProvedores({ rota: `/redefinir-senha?token=${TOKEN}` })
    await screen.findByRole('heading', { name: 'Criar nova senha' })

    await preencherSenhas('NovaSenha1')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este link de redefinição é inválido ou expirou. Peça um novo link.',
    )
    expect(
      screen.getByRole('link', { name: 'Pedir um novo link' }),
    ).toHaveAttribute('href', '/esqueci-senha')
  })

  it('senha recusada pela API aparece no campo, sem perder o link', async () => {
    registrarRedefinicoes(() =>
      HttpResponse.json(
        {
          message: 'Falha de validação',
          fieldErrors: [{ field: 'novaSenha', message: 'senha muito comum' }],
        },
        { status: 400 },
      ),
    )
    renderizarComProvedores({ rota: `/redefinir-senha?token=${TOKEN}` })
    await screen.findByRole('heading', { name: 'Criar nova senha' })

    await preencherSenhas('NovaSenha1')

    expect(await screen.findByText('senha muito comum')).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(
      screen.getByRole('heading', { name: 'Criar nova senha' }),
    ).toBeInTheDocument()
  })

  it('sem token na URL avisa que o link está incompleto', async () => {
    renderizarComProvedores({ rota: '/redefinir-senha' })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este link de redefinição está incompleto',
    )
    expect(
      screen.getByRole('link', { name: 'Pedir um novo link' }),
    ).toBeInTheDocument()
  })
})

describe('Usuário já logado', () => {
  const rotasLogado: RouteObject[] = [
    {
      element: <Localizacao />,
      children: [
        {
          element: <RotaPublica />,
          children: [
            { path: '/esqueci-senha', element: <p>tela de esqueci</p> },
            { path: '/redefinir-senha', element: <p>tela de redefinir</p> },
          ],
        },
        { path: '/dashboard', element: <p>tela inicial</p> },
      ],
    },
  ]

  it.each(['/esqueci-senha', '/redefinir-senha'])(
    'quem abre %s logado vai para a tela inicial',
    async (rota) => {
      renderizarComProvedores({
        rota,
        usuario: criarUsuario(),
        routes: rotasLogado,
      })

      expect(await screen.findByText('tela inicial')).toBeInTheDocument()
      expect(screen.getByTestId('url')).toHaveTextContent(/^\/dashboard$/)
      expect(screen.queryByText(/tela de (esqueci|redefinir)/)).toBeNull()
    },
  )

  it('permite redefinir a senha com o link do e-mail mesmo já autenticado', async () => {
    const corpos = registrarRedefinicoes()
    renderizarComProvedores({
      rota: `/redefinir-senha?token=${TOKEN}`,
      usuario: criarUsuario(),
      routes: rotasComUrl,
    })

    await screen.findByRole('heading', { name: 'Criar nova senha' })
    expect(screen.getByTestId('url')).toHaveTextContent(
      new RegExp(`^/redefinir-senha\\?token=${TOKEN}$`),
    )
    await preencherSenhas('NovaSenha1')

    expect(
      await screen.findByText('Senha redefinida. Entre com a nova senha.'),
    ).toBeInTheDocument()
    expect(corpos).toEqual([{ token: TOKEN, novaSenha: 'NovaSenha1' }])
  })
})
