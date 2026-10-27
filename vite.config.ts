import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Sem injetar o CSS no jsdom: com todas as telas no roteador, o CSS de
    // todas entrava em cada getComputedStyle (que o Testing Library usa em
    // toda consulta por papel) e deixava a suíte de 3 a 5 vezes mais lenta. Os
    // CSS Modules continuam devolvendo o nome da classe.
    css: false,
    globals: false,
    // Os specs do Playwright ficam em e2e/ e rodam pelo próprio Playwright.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
