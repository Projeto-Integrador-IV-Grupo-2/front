import { http, HttpResponse } from 'msw'
import {
  criarArea,
  criarAtribuicao,
  criarColaboradorAcompanhamento,
  criarCompetencia,
  criarDashboardColaborador,
  criarDashboardGestao,
  criarMensagemAssistente,
  criarSessaoAssistente,
  criarPagina,
  criarPaginaTrilhas,
  criarPaginaUsuarios,
  criarPdiAcao,
  criarPdiDetalhe,
  criarPdiItem,
  criarPdiResumo,
  criarProgressoTrilha,
  criarResultadoAtribuicao,
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

  http.get('*/api/dashboard/colaborador', () =>
    HttpResponse.json(criarDashboardColaborador()),
  ),

  http.get('*/api/dashboard/gestao', () =>
    HttpResponse.json(criarDashboardGestao()),
  ),

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

  http.get('*/api/trilhas/:id/etapas', () => HttpResponse.json([])),

  http.get('*/api/conteudos', () => HttpResponse.json(criarPagina([]))),

  http.get('*/api/categorias', () => HttpResponse.json(criarPagina([]))),

  http.post('*/api/trilhas', () =>
    HttpResponse.json(criarTrilhaResumo(), { status: 201 }),
  ),

  // Editar, inativar e ativar respondem com o RESUMO da trilha
  // (`TrilhaResumoResponse`), não com o detalhe — é o que a API faz, e a tela
  // depende disso para reler o detalhe em vez de confiar na resposta.
  http.put('*/api/trilhas/:id', () => HttpResponse.json(criarTrilhaResumo())),

  http.patch('*/api/trilhas/:id/inativar', () =>
    HttpResponse.json(criarTrilhaResumo()),
  ),

  http.patch('*/api/trilhas/:id/ativar', () =>
    HttpResponse.json(criarTrilhaResumo()),
  ),

  http.post('*/api/trilhas/:id/atribuicoes', () =>
    HttpResponse.json(criarResultadoAtribuicao(), { status: 201 }),
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

  http.get('*/api/areas/:id/trilhas', () =>
    HttpResponse.json(criarPaginaTrilhas()),
  ),

  http.get('*/api/atribuicoes', () =>
    HttpResponse.json(criarPagina([criarAtribuicao()])),
  ),

  http.get('*/api/atribuicoes/colaboradores/:usuarioId', () =>
    HttpResponse.json(criarColaboradorAcompanhamento()),
  ),

  http.get(
    '*/api/atribuicoes/exportar',
    () =>
      new HttpResponse('Colaborador;Trilha\nAna Souza;Onboarding\n', {
        headers: {
          'Content-Type': 'text/csv;charset=UTF-8',
          'Content-Disposition':
            'attachment; filename="acompanhamento-trilhas.csv"',
        },
      }),
  ),

  // PDI (issue #42). As rotas fixas vêm antes de /api/pdis/:id.
  http.get('*/api/pdis/meu', () => HttpResponse.json(criarPdiDetalhe())),

  http.get('*/api/pdis/colaboradores', () =>
    HttpResponse.json(
      criarPagina([
        {
          id: '00000000-0000-0000-0000-000000000001',
          nomeCompleto: 'Ana Souza',
          email: 'ana@nexo.com',
        },
      ]),
    ),
  ),

  http.get('*/api/pdis', () =>
    HttpResponse.json(criarPagina([criarPdiResumo()])),
  ),

  http.get('*/api/pdis/:id', () => HttpResponse.json(criarPdiDetalhe())),

  http.post('*/api/pdis', () =>
    HttpResponse.json(criarPdiDetalhe({ itens: [] }), { status: 201 }),
  ),

  http.post('*/api/pdis/:id/itens', () =>
    HttpResponse.json(criarPdiItem({ acoes: [] }), { status: 201 }),
  ),

  http.post('*/api/pdis/:id/itens/:itemId/acoes', () =>
    HttpResponse.json(criarPdiAcao(), { status: 201 }),
  ),

  http.get('*/api/competencias', () =>
    HttpResponse.json(criarPagina([criarCompetencia()])),
  ),

  http.post('*/api/competencias', () =>
    HttpResponse.json(criarCompetencia(), { status: 201 }),
  ),

  http.get('*/api/assistente/sessoes', () =>
    HttpResponse.json(criarPagina([criarSessaoAssistente()])),
  ),

  http.post('*/api/assistente/sessoes', () =>
    HttpResponse.json(criarSessaoAssistente(), { status: 201 }),
  ),

  http.get('*/api/assistente/sessoes/:id/mensagens', () =>
    HttpResponse.json([
      criarMensagemAssistente({
        id: 'm0000000-0000-4000-8000-000000000000',
        papel: 'USUARIO',
        conteudo: 'Onde fica a política de reembolso?',
        fontes: [],
      }),
      criarMensagemAssistente(),
    ]),
  ),

  http.post('*/api/assistente/sessoes/:id/mensagens', () =>
    HttpResponse.json(
      {
        sessao: criarSessaoAssistente(),
        pergunta: criarMensagemAssistente({ papel: 'USUARIO', fontes: [] }),
        resposta: criarMensagemAssistente(),
      },
      { status: 201 },
    ),
  ),

  http.patch('*/api/assistente/sessoes/:id', () =>
    HttpResponse.json(criarSessaoAssistente()),
  ),

  http.delete(
    '*/api/assistente/sessoes/:id',
    () => new HttpResponse(null, { status: 204 }),
  ),
]
