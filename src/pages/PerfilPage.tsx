import { useEffect, useState } from 'react'
import { CabecalhoPerfil } from '../components/perfil/CabecalhoPerfil.tsx'
import { DadosPerfilForm } from '../components/perfil/DadosPerfilForm.tsx'
import { TrocaSenhaForm } from '../components/perfil/TrocaSenhaForm.tsx'
import { buscarPerfil } from '../services/perfilService.ts'
import type { MeResponse } from '../types/perfil.ts'
import styles from './PerfilPage.module.css'

type Carregamento =
  | { estado: 'carregando' }
  | { estado: 'erro'; mensagem: string }
  | { estado: 'pronto'; perfil: MeResponse }

/**
 * Tela "Meu perfil", aberta a todos os perfis: o próprio usuário vê os seus
 * dados, muda o nome e troca a senha sem depender de um administrador.
 */
export function PerfilPage() {
  const [carregamento, setCarregamento] = useState<Carregamento>({
    estado: 'carregando',
  })
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    buscarPerfil({ signal: controller.signal })
      .then((perfil) => setCarregamento({ estado: 'pronto', perfil }))
      .catch((erro: Error) => {
        if (!controller.signal.aborted) {
          setCarregamento({ estado: 'erro', mensagem: erro.message })
        }
      })
    return () => controller.abort()
  }, [tentativa])

  function tentarDeNovo() {
    setCarregamento({ estado: 'carregando' })
    setTentativa((atual) => atual + 1)
  }

  return (
    <div className={styles.pagina}>
      <header>
        <h1 className={styles.titulo}>Meu perfil</h1>
        <p className={styles.hint}>
          Seus dados de acesso. Para mudar e-mail, perfil ou área, fale com um
          administrador.
        </p>
      </header>

      {carregamento.estado === 'carregando' && (
        <p className={styles.status} role="status">
          Carregando seu perfil…
        </p>
      )}

      {carregamento.estado === 'erro' && (
        <div className={styles.erro} role="alert">
          <p>{carregamento.mensagem}</p>
          <button type="button" onClick={tentarDeNovo}>
            Tentar de novo
          </button>
        </div>
      )}

      {carregamento.estado === 'pronto' && (
        <>
          <CabecalhoPerfil perfil={carregamento.perfil} />
          <div className={styles.grade}>
            <DadosPerfilForm perfil={carregamento.perfil} />
            <TrocaSenhaForm />
          </div>
        </>
      )}
    </div>
  )
}
