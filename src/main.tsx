import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { aplicarTema, temaSalvo } from './hooks/useTema.ts'
import './styles/global.css'
// Alvos de toque de 44px no celular (ver styles/toque.module.css).
import './styles/toque.module.css'

// Antes do primeiro render, para a página não piscar no tema errado.
aplicarTema(temaSalvo())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
