import { http, HttpResponse } from 'msw'
import { criarUsuario } from '../factories.ts'

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
]
