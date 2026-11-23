/** Empresa (tenant) como volta de `GET /api/admin/empresas`. */
export interface Empresa {
  id: string
  nome: string
  subdominio: string
  cnpj: string | null
  ativo: boolean
  criadoEm: string
  totalUsuarios: number
  /** `true` para a empresa dona da plataforma (Nexo). */
  plataforma: boolean
}

/** Corpo de `POST /api/admin/empresas`: a empresa e o primeiro administrador dela. */
export interface CriarEmpresaRequest {
  nome: string
  subdominio: string
  cnpj?: string
  nomeAdministrador: string
  emailAdministrador: string
  senhaAdministrador: string
}
