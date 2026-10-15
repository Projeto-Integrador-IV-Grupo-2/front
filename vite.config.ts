import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    globals: false,
    // Os specs do Playwright ficam em e2e/ e rodam pelo próprio Playwright.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
