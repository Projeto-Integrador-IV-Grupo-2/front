import { useCallback, useState } from 'react'

export type Tema = 'claro' | 'escuro'

const CHAVE = 'nexo:tema'

/** Tema salvo; claro quando não há escolha (é o padrão do protótipo). */
export function temaSalvo(): Tema {
  try {
    return localStorage.getItem(CHAVE) === 'escuro' ? 'escuro' : 'claro'
  } catch {
    // Sem armazenamento (navegação privada, dados bloqueados): fica o claro.
    return 'claro'
  }
}

/**
 * Aplica o tema no `<html>`. O tema escuro do `global.css` vale só com
 * `data-theme="dark"`; sem o atributo, é o claro.
 */
export function aplicarTema(tema: Tema): void {
  if (tema === 'escuro') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

/**
 * Tema da interface, como no protótipo: começa no claro e só muda pelo botão
 * "Tema". A escolha fica no `localStorage`, então vale nas próximas visitas.
 */
export function useTema() {
  const [tema, setTema] = useState<Tema>(temaSalvo)

  const alternar = useCallback(() => {
    setTema((atual) => {
      const proximo: Tema = atual === 'escuro' ? 'claro' : 'escuro'
      aplicarTema(proximo)
      try {
        localStorage.setItem(CHAVE, proximo)
      } catch {
        // Sem armazenamento a escolha vale só até recarregar a página.
      }
      return proximo
    })
  }, [])

  return { tema, alternar }
}
