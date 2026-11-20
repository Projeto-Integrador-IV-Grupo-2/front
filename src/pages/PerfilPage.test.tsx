import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { setStoredToken } from '../services/api.ts'
import { criarUsuario } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'
import type { UserRole } from '../types/user.ts'

// jsdom não desenha em canvas: a redução da imagem é trocada por um valor fixo.
vi.mock('../utils/imagem.ts', () => ({
  reduzirImagemQuadrada: vi.fn(async () => 'data:image/jpeg;base64,FOTO'),
}))

function abrirPerfil(papel: UserRole = 'COLABORADOR') {
  const usuario = criarUsuario({
    papel,
    area: { id: 'a1', nome: 'Tecnologia' },
  })
  renderizarComProvedores({ rota: '/perfil', usuario })
  return usuario
}

async function preencherSenhas(
  senhaAtual: string,
  novaSenha: string,
  confirmacao = novaSenha,
) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Senha atual'), senhaAtual)
  await user.type(screen.getByLabelText('Nova senha'), novaSenha)
  await user.type(screen.getByLabelText('Confirme a nova senha'), confirmacao)
  await user.click(screen.getByRole('button', { name: 'Trocar senha' }))
  return user
}

describe('PerfilPage', () => {
  it.each<UserRole>(['ADMIN', 'GESTOR', 'COLABORADOR'])(
    'abre para %s com os dados do /me só para leitura',
    async (papel) => {
      abrirPerfil(papel)

      expect(
        await screen.findByRole('heading', { name: 'Meu perfil' }),
      ).toBeInTheDocument()
      expect(await screen.findByLabelText('Nome completo')).toHaveValue(
        'Ana Souza',
      )
      const dados = screen.getByRole('region', { name: 'Dados pessoais' })
      expect(within(dados).getByText('ana@nexo.com')).toBeInTheDocument()
      // O admin não tem área: a linha nem aparece.
      if (papel === 'ADMIN') {
        expect(within(dados).queryByText('Área')).not.toBeInTheDocument()
      } else {
        expect(within(dados).getByText('Tecnologia')).toBeInTheDocument()
      }
      // Empresa ainda não vem no MeResponse.
      expect(within(dados).getByText('Não informado')).toBeInTheDocument()
      expect(
        screen.queryByRole('textbox', { name: 'E-mail' }),
      ).not.toBeInTheDocument()
    },
  )

  it('mostra o erro de carregamento e tenta de novo', async () => {
    // 1ª chamada: o provedor restaura a sessão; 2ª: a tela falha; 3ª: volta.
    let chamadas = 0
    server.use(
      http.get('*/api/auth/me', () => {
        chamadas += 1
        return chamadas === 2
          ? HttpResponse.json({ message: 'Fora do ar' }, { status: 503 })
          : HttpResponse.json(criarUsuario())
      }),
    )
    setStoredToken('token-de-teste')
    renderizarComProvedores({ rota: '/perfil' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Fora do ar')
    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar de novo' }),
    )
    expect(await screen.findByLabelText('Nome completo')).toHaveValue(
      'Ana Souza',
    )
  })

  it('salva o nome e atualiza o cabeçalho sem recarregar', async () => {
    abrirPerfil()
    const user = userEvent.setup()
    const campo = await screen.findByLabelText('Nome completo')

    await user.clear(campo)
    await user.type(campo, 'Ana Lima')
    await user.click(screen.getByRole('button', { name: 'Salvar nome' }))

    expect(await screen.findByText('Nome atualizado.')).toBeInTheDocument()
    const atalho = screen.getByRole('link', { name: /Ana Lima/ })
    expect(atalho).toHaveAttribute('href', '/perfil')
    expect(screen.getByRole('link', { name: 'Meu perfil' })).toHaveTextContent(
      'AL',
    )
  })

  it('mostra o erro de campo da API embaixo do nome', async () => {
    server.use(
      http.put('*/api/auth/me', () =>
        HttpResponse.json(
          {
            message: 'Dados inválidos',
            fieldErrors: [
              { field: 'nomeCompleto', message: 'nome muito curto' },
            ],
          },
          { status: 400 },
        ),
      ),
    )
    abrirPerfil()
    const user = userEvent.setup()
    const campo = await screen.findByLabelText('Nome completo')

    await user.clear(campo)
    await user.type(campo, 'A')
    await user.click(screen.getByRole('button', { name: 'Salvar nome' }))

    expect(await screen.findByText('nome muito curto')).toBeInTheDocument()
    expect(campo).toHaveAccessibleDescription('nome muito curto')
    expect(campo).toHaveAttribute('aria-invalid', 'true')
  })

  it('confere a regra e a confirmação da senha antes de enviar', async () => {
    let enviou = false
    server.use(
      http.patch('*/api/auth/me/senha', () => {
        enviou = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    abrirPerfil()

    await preencherSenhas('Antiga123', 'fraca', 'outra')

    expect(
      screen.getByText(
        'Use ao menos 8 caracteres, com letra maiúscula, minúscula e número.',
        { selector: '[id$="-erro"]' },
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument()
    expect(enviou).toBe(false)
  })

  it('troca a senha, avisa e limpa os campos', async () => {
    abrirPerfil()

    await preencherSenhas('Antiga123', 'Nova12345')

    expect(await screen.findByText(/Senha alterada/)).toBeInTheDocument()
    for (const rotulo of [
      'Senha atual',
      'Nova senha',
      'Confirme a nova senha',
    ]) {
      expect(screen.getByLabelText(rotulo)).toHaveValue('')
    }
    // Nada das senhas vai para o armazenamento nem para a URL.
    expect(JSON.stringify({ ...localStorage })).not.toContain('Nova12345')
    expect(window.location.href).not.toContain('Nova12345')
  })

  it('mostra a senha atual incorreta embaixo do campo certo', async () => {
    server.use(
      http.patch('*/api/auth/me/senha', () =>
        HttpResponse.json(
          {
            message: 'Dados inválidos',
            fieldErrors: [
              { field: 'senhaAtual', message: 'Senha atual incorreta' },
            ],
          },
          { status: 400 },
        ),
      ),
    )
    abrirPerfil()

    await preencherSenhas('Errada123', 'Nova12345')

    await waitFor(() =>
      expect(screen.getByLabelText('Senha atual')).toHaveAccessibleDescription(
        'Senha atual incorreta',
      ),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('adiciona a foto, mostra no menu e remove', async () => {
    abrirPerfil()
    const container = document.body
    const user = userEvent.setup()
    const seletor = await screen.findByLabelText('Adicionar foto')

    await user.upload(seletor, new File(['x'], 'eu.png', { type: 'image/png' }))

    expect(await screen.findByText('Foto atualizada.')).toBeInTheDocument()
    // Cabeçalho do perfil, cartão do menu e avatar da barra de cima.
    expect(
      container.querySelectorAll('img[src="data:image/jpeg;base64,FOTO"]'),
    ).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: 'Remover' }))

    expect(screen.getByText('Foto removida.')).toBeInTheDocument()
    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(screen.getByLabelText('Adicionar foto')).toBeInTheDocument()
  })

  it('avisa quando o arquivo não é imagem', async () => {
    abrirPerfil()
    const user = userEvent.setup({ applyAccept: false })

    await user.upload(
      await screen.findByLabelText('Adicionar foto'),
      new File(['x'], 'doc.pdf', { type: 'application/pdf' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Escolha uma imagem JPG, PNG ou WebP.',
    )
  })
})
