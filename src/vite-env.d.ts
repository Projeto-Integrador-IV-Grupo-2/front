/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** `'true'` responde as rotas de trilhas com o mock em memória. */
  readonly VITE_TRILHAS_MOCK?: string
  /**
   * Mock das sugestões de trilhas: ligado por padrão; `'false'` usa a API e
   * `'area'` simula a recomendação por área (IA fora do ar).
   */
  readonly VITE_SUGESTOES_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
