import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { server } from './msw/server.ts'

// `onUnhandledRequest: 'error'` mantém o teste honesto: requisição sem handler
// falha em vez de escapar para a rede de verdade.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
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
