/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** `'true'` responde as rotas de trilhas com o mock em memória. */
  readonly VITE_TRILHAS_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
