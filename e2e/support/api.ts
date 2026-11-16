import { request, type APIRequestContext } from '@playwright/test'

/**
 * Acesso direto à API para preparar dados dos testes (criar uma trilha, um
 * usuário...) sem passar pela tela. O que está sendo testado é sempre feito
 * pela interface; isto só monta o cenário.
 */
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080'

export interface Credenciais {
  email: string
  senha: string
}

export interface UsuarioDeTeste extends Credenciais {
  nomeCompleto: string
  papel: 'ADMIN' | 'GESTOR' | 'COLABORADOR'
}

/** Administrador que já existe no banco de desenvolvimento (seed do backend). */
export const ADMIN: Credenciais = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin@nexo.com',
  senha: process.env.E2E_ADMIN_SENHA ?? 'admin123',
}

/** Criados pela preparação (`auth.setup.ts`) se ainda não existirem. */
export const GESTOR: UsuarioDeTeste = {
  nomeCompleto: 'E2E Gestora',
  email: 'e2e.gestor@nexo.com',
  senha: 'SenhaE2E123',
  papel: 'GESTOR',
}

export const COLABORADOR: UsuarioDeTeste = {
  nomeCompleto: 'E2E Colaborador',
  email: 'e2e.colaborador@nexo.com',
  senha: 'SenhaE2E123',
  papel: 'COLABORADOR',
}

export interface Sessao {
  token: string
  expiraEm: string
}

export async function entrar(credenciais: Credenciais): Promise<Sessao> {
  const contexto = await request.newContext({ baseURL: API_URL })
  try {
    const resposta = await contexto.post('/api/auth/login', {
      data: credenciais,
    })
    if (!resposta.ok()) {
      throw new Error(
        `Login de ${credenciais.email} falhou (${resposta.status()}): ${await resposta.text()}`,
      )
    }
    return (await resposta.json()) as Sessao
  } finally {
    await contexto.dispose()
  }
}

/** Cliente da API já autenticado. Lembre de chamar `dispose()` ao terminar. */
export async function apiComo(
  credenciais: Credenciais,
): Promise<APIRequestContext> {
  const { token } = await entrar(credenciais)
  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  })
}

async function corpoOuErro<T>(
  resposta: Awaited<ReturnType<APIRequestContext['post']>>,
  operacao: string,
): Promise<T> {
  if (!resposta.ok()) {
    throw new Error(
      `${operacao} falhou (${resposta.status()}): ${await resposta.text()}`,
    )
  }
  return (await resposta.json()) as T
}

export interface Recurso {
  id: string
  nome: string
}

export async function criarArea(
  api: APIRequestContext,
  nome: string,
): Promise<Recurso> {
  return corpoOuErro(
    await api.post('/api/areas', { data: { nome, descricao: null } }),
    'Criar área',
  )
}

export async function criarTrilha(
  api: APIRequestContext,
  dados: { nome: string; areaId?: string | null; prazoDias?: number | null },
): Promise<Recurso> {
  return corpoOuErro(
    await api.post('/api/trilhas', {
      data: {
        nome: dados.nome,
        areaId: dados.areaId ?? null,
        prazoDias: dados.prazoDias ?? null,
        objetivos: 'Trilha criada pelos testes E2E.',
      },
    }),
    'Criar trilha',
  )
}

/** Cria o usuário; se o e-mail já existir (409), segue em frente. */
export async function garantirUsuario(
  api: APIRequestContext,
  usuario: UsuarioDeTeste,
): Promise<void> {
  const resposta = await api.post('/api/usuarios', {
    data: {
      nomeCompleto: usuario.nomeCompleto,
      email: usuario.email,
      senha: usuario.senha,
      papel: usuario.papel,
      cargoId: null,
      areaId: null,
      dataEntrada: '2026-01-05',
    },
  })
  if (!resposta.ok() && resposta.status() !== 409) {
    throw new Error(
      `Criar usuário ${usuario.email} falhou (${resposta.status()}): ${await resposta.text()}`,
    )
  }
}

/** O usuário autenticado inicia a trilha (vira "em andamento"). */
export async function iniciarTrilha(
  api: APIRequestContext,
  trilhaId: string,
): Promise<void> {
  await corpoOuErro(
    await api.post(`/api/trilhas/${trilhaId}/progresso`),
    'Iniciar trilha',
  )
}
