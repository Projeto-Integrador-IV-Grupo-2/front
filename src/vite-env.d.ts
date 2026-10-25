/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** `'true'` responde as rotas de trilhas com o mock em memória. */
  readonly VITE_TRILHAS_MOCK?: string
  /**
   * `'true'` responde as sugestões de trilhas com o mock; `'area'` também,
   * simulando a IA fora do ar. Sem a variável, usa a API.
   */
  readonly VITE_SUGESTOES_MOCK?: string
  /** Mock da ajuda da IA nas trilhas: ligado por padrão; `'false'` usa a API. */
  readonly VITE_AJUDA_IA_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
