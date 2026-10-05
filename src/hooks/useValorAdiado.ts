import { useEffect, useState } from 'react'

/**
 * Devolve `valor` só depois de ele ficar `atrasoMs` sem mudar. Usado nos
 * campos de busca: a requisição sai quando a pessoa para de digitar, não a
 * cada tecla.
 */
export function useValorAdiado<T>(valor: T, atrasoMs = 400): T {
  const [adiado, setAdiado] = useState(valor)

  useEffect(() => {
    const espera = setTimeout(() => setAdiado(valor), atrasoMs)
    return () => clearTimeout(espera)
  }, [valor, atrasoMs])

  return adiado
}
