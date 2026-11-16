import path from 'node:path'

/**
 * Nome único por execução. Os testes rodam contra o banco de desenvolvimento
 * e não apagam o que criam, então cada registro leva o prefixo "E2E" e um
 * sufixo que nunca se repete — rodar a suíte duas vezes não gera conflito.
 */
export function unico(rotulo: string): string {
  const sufixo = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return `E2E ${rotulo} ${sufixo}`
}

const PASTA_DE_SESSOES = path.join(import.meta.dirname, '..', '.auth')

/** Sessões salvas pela preparação: cada teste escolhe com qual perfil entra. */
export const SESSAO = {
  admin: path.join(PASTA_DE_SESSOES, 'admin.json'),
  gestor: path.join(PASTA_DE_SESSOES, 'gestor.json'),
  colaborador: path.join(PASTA_DE_SESSOES, 'colaborador.json'),
} as const

/** Contexto sem ninguém logado, para os testes de login. */
export const SEM_SESSAO = { cookies: [], origins: [] }
