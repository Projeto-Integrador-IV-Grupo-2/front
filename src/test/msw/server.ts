import { setupServer } from 'msw/node'
import { handlers } from './handlers.ts'

/** Servidor de mocks HTTP dos testes. Ciclo de vida em src/test/setup.ts. */
export const server = setupServer(...handlers)
