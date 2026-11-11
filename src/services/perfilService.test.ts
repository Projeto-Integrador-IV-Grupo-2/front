import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  atualizarPerfil,
  buscarPerfil,
  PerfilServiceError,
  trocarSenha,
} from './perfilService.ts'
import { criarUsuario } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'

describe('perfilService', () => {
  it('busca o perfil em GET /api/auth/me', async () => {
    server.use(
      http.get('*/api/auth/me', () =>
        HttpResponse.json(
          criarUsuario({ area: { id: 'a1', nome: 'Tecnologia' } }),
        ),
      ),
    )

    const perfil = await buscarPerfil()

    expect(perfil.nomeCompleto).toBe('Ana Souza')
    expect(perfil.area?.nome).toBe('Tecnologia')
  })

  it('envia só o nome no PUT e devolve o perfil gravado', async () => {
    let corpo: unknown
    server.use(
      http.put('*/api/auth/me', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(criarUsuario({ nomeCompleto: 'Ana Lima' }))
      }),
    )

    const perfil = await atualizarPerfil({ nomeCompleto: 'Ana Lima' })

    expect(corpo).toEqual({ nomeCompleto: 'Ana Lima' })
    expect(perfil.nomeCompleto).toBe('Ana Lima')
  })

  it('troca a senha com PATCH em /api/auth/me/senha', async () => {
    let corpo: unknown
    server.use(
      http.patch('*/api/auth/me/senha', async ({ request }) => {
        corpo = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await trocarSenha({ senhaAtual: 'Antiga123', novaSenha: 'Nova12345' })

    expect(corpo).toEqual({ senhaAtual: 'Antiga123', novaSenha: 'Nova12345' })
  })

  it('normaliza o erro da API com os erros por campo', async () => {
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

    const erro = await trocarSenha({
      senhaAtual: 'Errada123',
      novaSenha: 'Nova12345',
    }).catch((falha: unknown) => falha)

    expect(erro).toBeInstanceOf(PerfilServiceError)
    expect(erro).toMatchObject({
      status: 400,
      fieldErrors: [{ field: 'senhaAtual', message: 'Senha atual incorreta' }],
    })
    // O erro normalizado não carrega o que foi enviado.
    expect(JSON.stringify(erro)).not.toContain('Errada123')
  })

  it('usa a mensagem padrão quando a rede falha', async () => {
    server.use(http.put('*/api/auth/me', () => HttpResponse.error()))

    await expect(
      atualizarPerfil({ nomeCompleto: 'Ana Lima' }),
    ).rejects.toMatchObject({
      message: 'Não foi possível salvar o seu nome.',
    })
  })
})
