import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { request, test as preparar } from '@playwright/test'
import {
  ADMIN,
  API_URL,
  COLABORADOR,
  GESTOR,
  apiComo,
  entrar,
  garantirUsuario,
  type Credenciais,
} from './support/api.ts'
import { SESSAO } from './support/dados.ts'

/**
 * Roda uma vez antes de todos os testes: confere se a API está no ar, cria os
 * usuários de teste (gestor e colaborador) e salva a sessão de cada perfil.
 *
 * O login é feito pela API e gravado no mesmo lugar em que o front guarda a
 * sessão (localStorage, chaves `nexo:token` e `nexo:token-expira-em`). Assim
 * cada teste já começa logado, sem repetir a tela de login — que tem os seus
 * próprios testes em `autenticacao.spec.ts`.
 */
preparar('API no ar e sessões por perfil', async ({ baseURL }) => {
  const api = await request.newContext({ baseURL: API_URL })
  const saude = await api.get('/api/health').catch(() => null)
  await api.dispose()
  if (!saude?.ok()) {
    throw new Error(
      `A API não respondeu em ${API_URL}/api/health. Suba o backend antes dos testes E2E ` +
        '(docker compose up -d && ./mvnw spring-boot:run, na pasta do back).',
    )
  }

  const comoAdmin = await apiComo(ADMIN)
  await garantirUsuario(comoAdmin, GESTOR)
  await garantirUsuario(comoAdmin, COLABORADOR)
  await comoAdmin.dispose()

  await salvarSessao(ADMIN, SESSAO.admin, baseURL!)
  await salvarSessao(GESTOR, SESSAO.gestor, baseURL!)
  await salvarSessao(COLABORADOR, SESSAO.colaborador, baseURL!)
})

async function salvarSessao(
  credenciais: Credenciais,
  arquivo: string,
  origem: string,
): Promise<void> {
  const { token, expiraEm } = await entrar(credenciais)
  const estado = {
    cookies: [],
    origins: [
      {
        origin: new URL(origem).origin,
        localStorage: [
          { name: 'nexo:token', value: token },
          { name: 'nexo:token-expira-em', value: expiraEm },
        ],
      },
    ],
  }
  await mkdir(path.dirname(arquivo), { recursive: true })
  await writeFile(arquivo, JSON.stringify(estado, null, 2), 'utf8')
}
