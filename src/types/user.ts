// Perfis ainda não definidos pelo backend (auth/usuários não implementados
// lá até este card) — ajustar aqui assim que o contrato da API for fechado.
export type UserRole = 'ADMIN' | 'GESTOR' | 'COLABORADOR'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}
