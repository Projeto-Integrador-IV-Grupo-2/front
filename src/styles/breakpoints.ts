/*
 * Breakpoints do projeto para o código TypeScript.
 *
 * São os mesmos números de `breakpoints.module.css`, que o CSS importa com
 * `@value`. CSS e JavaScript não têm como compartilhar o valor em tempo de
 * execução (uma media query não aceita `var(--...)`), então o par de arquivos
 * é mantido em sincronia na mão. Alterou um, altere o outro.
 */

/** Maior largura tratada como celular. */
export const LARGURA_CELULAR = 640

/** Maior largura tratada como tablet. */
export const LARGURA_TABLET = 1024

/** Media query de celular — igual ao `@value ateCelular` do CSS. */
export const ATE_CELULAR = `(max-width: ${LARGURA_CELULAR}px)`

/** Media query de celular ou tablet — igual ao `@value ateTablet` do CSS. */
export const ATE_TABLET = `(max-width: ${LARGURA_TABLET}px)`
