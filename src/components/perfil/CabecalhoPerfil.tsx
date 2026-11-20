import { useRef, useState, type ChangeEvent } from 'react'
import { AvisoSucesso } from '../comum/AvisoSucesso.tsx'
import { useAuth } from '../../hooks/useAuth.ts'
import { useFotoPerfil } from '../../hooks/useFotoPerfil.ts'
import {
  FotoPerfilError,
  removerFoto,
  salvarFoto,
  TAMANHO_MAXIMO_MB,
  TIPOS_ACEITOS,
} from '../../services/fotoPerfilService.ts'
import type { MeResponse } from '../../types/perfil.ts'
import { ROTULOS_PERFIL } from '../../types/usuario.ts'
import { AvatarUsuario } from '../comum/AvatarUsuario.tsx'
import styles from './CabecalhoPerfil.module.css'

interface CabecalhoPerfilProps {
  perfil: MeResponse
}

/**
 * Cartão do topo do perfil: foto, nome, perfil e e-mail. O nome vem do
 * AuthContext, então acompanha na hora quando é salvo logo abaixo.
 */
export function CabecalhoPerfil({ perfil }: CabecalhoPerfilProps) {
  const { user } = useAuth()
  const nome = user?.nomeCompleto ?? perfil.nomeCompleto
  const foto = useFotoPerfil(perfil.id)
  const seletor = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  async function aoEscolher(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    // Limpo já: escolher a mesma imagem de novo precisa disparar o change.
    evento.target.value = ''
    if (!arquivo) {
      return
    }
    setErro(null)
    setAviso(null)
    setEnviando(true)
    try {
      await salvarFoto(perfil.id, arquivo)
      setAviso('Foto atualizada.')
    } catch (falha) {
      setErro(
        falha instanceof FotoPerfilError
          ? falha.message
          : 'Não foi possível usar essa imagem.',
      )
    } finally {
      setEnviando(false)
    }
  }

  function aoRemover() {
    removerFoto(perfil.id)
    setErro(null)
    setAviso('Foto removida.')
    seletor.current?.focus()
  }

  return (
    <section className={styles.cartao} aria-label="Resumo do perfil">
      <div className={styles.identidade}>
        <AvatarUsuario
          usuarioId={perfil.id}
          nome={nome}
          className={styles.avatar}
        />
        <div className={styles.textos}>
          <p className={styles.nome}>{nome}</p>
          <p className={styles.email}>{perfil.email}</p>
          <span className={styles.selo}>{ROTULOS_PERFIL[perfil.papel]}</span>
        </div>
      </div>

      <div className={styles.foto}>
        <div className={styles.botoes}>
          {/* O input fica escondido; o rótulo é o botão visível. */}
          <input
            ref={seletor}
            id={`foto-${perfil.id}`}
            type="file"
            accept={TIPOS_ACEITOS.join(',')}
            className={styles.arquivo}
            onChange={aoEscolher}
            disabled={enviando}
          />
          <label
            htmlFor={`foto-${perfil.id}`}
            className={styles.botao}
            aria-disabled={enviando}
          >
            <CameraIcon />
            {enviando ? 'Carregando…' : foto ? 'Trocar foto' : 'Adicionar foto'}
          </label>
          {foto && (
            <button
              type="button"
              className={styles.remover}
              onClick={aoRemover}
              disabled={enviando}
            >
              Remover
            </button>
          )}
        </div>
        <p className={styles.dica}>
          JPG, PNG ou WebP, até {TAMANHO_MAXIMO_MB} MB. Fica salva neste
          navegador.
        </p>
        {erro && (
          <p className={styles.erro} role="alert">
            {erro}
          </p>
        )}
        <AvisoSucesso mensagem={aviso} onSumir={() => setAviso(null)} />
      </div>
    </section>
  )
}

function CameraIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 6.5A1.5 1.5 0 0 1 4.5 5h2l1.2-1.8h4.6L13.5 5h2A1.5 1.5 0 0 1 17 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5v-8z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10.5" r="3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
