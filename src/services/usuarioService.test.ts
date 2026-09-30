import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  atualizarSituacaoUsuario,
  atualizarUsuario,
  criarUsuario,
  listarUsuarios,
  UsuarioServiceError,
} from './usuarioService.ts'
import { criarPaginaUsuarios, criarUsuarioGestao } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'

describe('usuarioService', () => {
  it('envia paginação padrão e omite filtro vazio da query', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/usuarios', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(criarPaginaUsuarios())
      }),
    )

    await listarUsuarios({ nome: 'ana', email: '', perfil: '' })

    const params = url!.searchParams
    expect(params.get('nome')).toBe('ana')
    expect(params.has('email')).toBe(false)
    expect(params.has('perfil')).toBe(false)
    expect(params.get('page')).toBe('0')
    expect(params.get('size')).toBe('20')
    expect(params.get('sort')).toBe('nomeCompleto')
  })

  it('envia o perfil com o nome que a API espera (papel)', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/usuarios', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(criarPaginaUsuarios())
      }),
    )

    await listarUsuarios({ perfil: 'GESTOR', departamento: 'Vendas' })

    const params = url!.searchParams
    expect(params.get('papel')).toBe('GESTOR')
    expect(params.has('perfil')).toBe(false)
    expect(params.get('departamento')).toBe('Vendas')
  })

  it('devolve o conteúdo e os contadores da página', async () => {
    server.use(
      http.get('*/api/usuarios', () =>
        HttpResponse.json(
          criarPaginaUsuarios([criarUsuarioGestao()], {
            totalElements: 42,
            totalPages: 5,
            number: 2,
          }),
        ),
      ),
    )

    const pagina = await listarUsuarios({}, { page: 2 })

    expect(pagina.content).toHaveLength(1)
    expect(pagina.page.totalElements).toBe(42)
    expect(pagina.page.number).toBe(2)
  })

  it('preserva a mensagem e os fieldErrors da API em e-mail duplicado', async () => {
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

    const erro = await criarUsuario({
      nomeCompleto: 'Ana',
      email: 'ana@nexo.com',
      senha: 'Senha1234',
      papel: 'COLABORADOR',
      cargoId: null,
      areaId: null,
      dataEntrada: '2025-02-10',
    }).catch((causa: unknown) => causa)

    expect(erro).toBeInstanceOf(UsuarioServiceError)
    const servico = erro as UsuarioServiceError
    expect(servico.message).toBe('Já existe um usuário com este e-mail.')
    expect(servico.status).toBe(409)
    expect(servico.fieldErrors).toEqual([
      { field: 'email', message: 'e-mail já cadastrado' },
    ])
  })

  it('traduz 403 sem corpo em mensagem de permissão', async () => {
    server.use(
      http.put(
        '*/api/usuarios/:id',
        () => new HttpResponse(null, { status: 403 }),
      ),
    )

    const erro = await atualizarUsuario('id-1', {
      nomeCompleto: 'Ana',
      cargoId: null,
      areaId: null,
      papel: 'GESTOR',
    }).catch((causa: unknown) => causa)

    expect((erro as UsuarioServiceError).message).toBe(
      'Você não tem permissão para esta operação.',
    )
  })

  it('manda a nova situação no PATCH de situação', async () => {
    let corpo: unknown = null
    server.use(
      http.patch('*/api/usuarios/:id/situacao', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(criarUsuarioGestao({ situacao: 'INATIVO' }))
      }),
    )

    const usuario = await atualizarSituacaoUsuario('id-1', 'INATIVO')

    expect(corpo).toEqual({ situacao: 'INATIVO' })
    expect(usuario.situacao).toBe('INATIVO')
  })
})
