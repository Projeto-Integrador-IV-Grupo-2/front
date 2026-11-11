import { ATE_CELULAR, ATE_TABLET } from '../styles/breakpoints.ts'
import { useMediaQuery } from './useMediaQuery.ts'

/*
 * Ponto único do projeto para "de que tamanho é a tela?".
 *
 * Nenhum componente escreve a própria media query nem escuta `resize`: os dois
 * hooks daqui se apoiam no `useMediaQuery`, que assina o `matchMedia` nativo
 * (Observer) e avisa quem usa quando a faixa muda. Assim a lista de
 * breakpoints vive só em `styles/breakpoints.ts` e em
 * `styles/breakpoints.module.css`.
 */

/** `true` quando a tela está na faixa de celular (até 640px). */
export function useTelaPequena(): boolean {
  return useMediaQuery(ATE_CELULAR)
}

/** `true` em celular e tablet (até 1024px) — onde o menu lateral vira gaveta. */
export function useTelaAteTablet(): boolean {
  return useMediaQuery(ATE_TABLET)
}
