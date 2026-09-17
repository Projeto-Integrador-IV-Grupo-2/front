import { http, HttpResponse } from 'msw'
import {
  criarArea,
  criarPaginaTrilhas,
  criarPaginaUsuarios,
  criarProgressoTrilha,
  criarTrilhaDetalhe,
  criarTrilhaResumo,
  criarUsuario,
  criarUsuarioGestao,
} from '../factories.ts'

/**
 * Os caminhos usam o curinga `*` de propósito: a `baseURL` do Axios vem de
 * `VITE_API_URL`, que existe no `.env` local e não existe na etapa de testes
 * do CI. Com `*` o handler casa tanto com a URL absoluta quanto com a relativa.
 */
export const handlers = [
  http.post('*/api/auth/login', () =>
    HttpResponse.json({
      token: 'token-de-teste',
      tipo: 'Bearer',
      expiraEm: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      usuario: criarUsuario(),
    }),
  ),

  http.get('*/api/auth/me', () => HttpResponse.json(criarUsuario())),

  http.get('*/api/usuarios', () => HttpResponse.json(criarPaginaUsuarios())),

  http.post('*/api/usuarios', () =>
    HttpResponse.json(criarUsuarioGestao(), { status: 201 }),
  ),

  http.put('*/api/usuarios/:id', () => HttpResponse.json(criarUsuarioGestao())),

  http.patch('*/api/usuarios/:id/situacao', () =>
    HttpResponse.json(criarUsuarioGestao({ situacao: 'INATIVO' })),
  ),

  http.get('*/api/trilhas', () => HttpResponse.json(criarPaginaTrilhas())),

  http.get('*/api/trilhas/:id', () => HttpResponse.json(criarTrilhaDetalhe())),

  http.post('*/api/trilhas/:id/progresso', () =>
    HttpResponse.json(criarProgressoTrilha()),
  ),

  http.patch('*/api/trilhas/:id/progresso', () =>
    HttpResponse.json(criarProgressoTrilha({ status: 'CONCLUIDA' })),
  ),

  http.post('*/api/trilhas', () =>
    HttpResponse.json(criarTrilhaResumo(), { status: 201 }),
  ),

  // Resumo mínimo (id + nome), do jeito que o formulário de Trilha consome
  // para popular o select de área. O CRUD completo de Área (abaixo) sempre
  // sobrescreve este handler nos próprios testes, então os dois convivem.
  http.get('*/api/areas', () =>
    HttpResponse.json({
      content: [
        { id: '33333333-3333-3333-3333-333333333333', nome: 'Tecnologia' },
      ],
      page: { size: 100, number: 0, totalElements: 1, totalPages: 1 },
    }),
  ),

  http.post('*/api/areas', () =>
    HttpResponse.json(criarArea(), { status: 201 }),
  ),

  http.put('*/api/areas/:id', () => HttpResponse.json(criarArea())),

  http.patch('*/api/areas/:id/inativar', () =>
    HttpResponse.json(criarArea({ ativo: false })),
  ),

  http.patch('*/api/areas/:id/ativar', () =>
    HttpResponse.json(criarArea({ ativo: true })),
  ),
]
