import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { server } from './msw/server.ts'

// `onUnhandledRequest: 'error'` mantém o teste honesto: requisição sem handler
// falha em vez de escapar para a rede de verdade.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

// O Vitest lê o `.env` local, onde o mock de trilhas costuma estar ligado.
// Os testes falam sempre com o MSW, para não depender da máquina de quem roda;
// quem quiser testar o mock liga a flag no próprio teste.
beforeEach(() => {
  vi.stubEnv('VITE_TRILHAS_MOCK', 'false')
  vi.stubEnv('VITE_SUGESTOES_MOCK', 'false')
  vi.stubEnv('VITE_AJUDA_IA_MOCK', 'false')
  vi.stubEnv('VITE_ASSISTENTE_MOCK', 'false')
})

afterEach(() => {
  vi.unstubAllEnvs()
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  // O tema fica no <html>, que é o mesmo entre os testes de um arquivo.
  document.documentElement.removeAttribute('data-theme')
})

afterAll(() => {
  server.close()
})

// jsdom não implementa matchMedia (não faz layout real). Como useMediaQuery
// depende dela, fornecemos um mock mínimo para os testes rodarem no jsdom.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
