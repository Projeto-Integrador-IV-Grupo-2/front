import { defineConfig, devices } from '@playwright/test'

/**
 * Testes de ponta a ponta (E2E): o navegador de verdade usa o front, que fala
 * com a API de verdade. Precisam do backend no ar (ver "Testes E2E" no README).
 *
 * Variáveis de ambiente (todas opcionais):
 *  - E2E_BASE_URL: endereço do front (padrão http://localhost:5173). Se for
 *    informado, o Playwright não sobe o Vite: usa o que já estiver rodando lá.
 *  - E2E_API_URL: endereço da API (padrão http://localhost:8080).
 *  - E2E_CHANNEL: usa um navegador já instalado (`msedge` ou `chrome`) em vez
 *    do Chromium do Playwright — evita o download de `playwright install`.
 *  - E2E_ADMIN_EMAIL / E2E_ADMIN_SENHA: administrador usado na preparação.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const sobeOFront = process.env.E2E_BASE_URL === undefined

export default defineConfig({
  testDir: './e2e',
  // Os arquivos rodam em paralelo; dentro de um arquivo, em ordem.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Faz login pela API e cria os usuários de teste; os demais dependem dele.
    { name: 'preparacao', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      dependencies: ['preparacao'],
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.E2E_CHANNEL ? { channel: process.env.E2E_CHANNEL } : {}),
      },
    },
  ],

  webServer: sobeOFront
    ? {
        command: 'npm run dev -- --port 5173 --strictPort',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      }
    : undefined,
})
