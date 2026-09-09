import { useCallback, useSyncExternalStore } from 'react'

function getSnapshot(query: string): boolean {
  return window.matchMedia(query).matches
}

function getServerSnapshot(): boolean {
  return false
}

/**
 * Observa uma media query em tempo real (ex.: `(max-width: 640px)`).
 * Usa useSyncExternalStore para se inscrever na API nativa `matchMedia`
 * sem recorrer a useEffect + setState.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQueryList = window.matchMedia(query)
      mediaQueryList.addEventListener('change', onChange)
      return () => mediaQueryList.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(query),
    getServerSnapshot,
  )
}
