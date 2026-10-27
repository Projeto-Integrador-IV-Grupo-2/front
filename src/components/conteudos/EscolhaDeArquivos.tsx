import { useId, useRef, useState, type DragEvent } from 'react'
import { validarArquivo } from '../../services/arquivoService.ts'
import {
  ACCEPT_ARQUIVOS,
  FORMATOS_ACEITOS,
  TAMANHO_MAXIMO_BYTES,
  formatarTamanho,
} from '../../types/arquivo.ts'
import styles from './EscolhaDeArquivos.module.css'

interface EscolhaDeArquivosProps {
  arquivos: File[]
  onAlterar: (arquivos: File[]) => void
  desabilitado?: boolean
  /** Troca o cadastro para o tipo Link, para quem tem só o endereço. */
  onUsarLink?: () => void
}

interface Recusado {
  nome: string
  motivo: string
}

/**
 * Escolha dos arquivos de um documento novo, dentro do próprio cadastro:
 * pelo botão ou arrastando do computador. Só escolhe — quem envia é a tela,
 * depois que o documento existe na API.
 *
 * Tipo e tamanho são conferidos na escolha (a API confere de novo); os
 * recusados ficam listados com o motivo e não entram na fila.
 */
export function EscolhaDeArquivos({
  arquivos,
  onAlterar,
  desabilitado = false,
  onUsarLink,
}: EscolhaDeArquivosProps) {
  const campoId = useId()
  const entrada = useRef<HTMLInputElement>(null)
  const [recusados, setRecusados] = useState<Recusado[]>([])
  const [arrastando, setArrastando] = useState(false)

  function acrescentar(escolhidos: File[]) {
    const aceitos: File[] = []
    const novosRecusados: Recusado[] = []
    for (const arquivo of escolhidos) {
      const motivo = validarArquivo(arquivo)
      if (motivo) {
        novosRecusados.push({ nome: arquivo.name, motivo })
      } else if (!arquivos.some((atual) => mesmoArquivo(atual, arquivo))) {
        aceitos.push(arquivo)
      }
    }
    setRecusados(novosRecusados)
    if (aceitos.length > 0) {
      onAlterar([...arquivos, ...aceitos])
    }
  }

  function soltar(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault()
    setArrastando(false)
    if (!desabilitado) {
      acrescentar(Array.from(evento.dataTransfer.files))
    }
  }

  const formatos = FORMATOS_ACEITOS.map(({ extensao }) =>
    extensao.replace('.', '').toUpperCase(),
  ).join(', ')

  return (
    <div className={styles.escolha}>
      <span className={styles.rotulo} id={`${campoId}-rotulo`}>
        Arquivos do documento
      </span>
      <div
        className={`${styles.area} ${arrastando ? styles.areaAtiva : ''}`}
        onDragOver={(evento) => {
          evento.preventDefault()
          if (!desabilitado) setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
      >
        <UploadIcon />
        <p className={styles.chamada}>
          Arraste os arquivos para cá ou{' '}
          <button
            type="button"
            className={styles.escolher}
            onClick={() => entrada.current?.click()}
            disabled={desabilitado}
          >
            escolha no computador
          </button>
        </p>
        <p className={styles.formatos}>
          {formatos} · até {formatarTamanho(TAMANHO_MAXIMO_BYTES)} cada
        </p>
        <input
          ref={entrada}
          id={campoId}
          className="visually-hidden"
          type="file"
          multiple
          accept={ACCEPT_ARQUIVOS}
          aria-labelledby={`${campoId}-rotulo`}
          disabled={desabilitado}
          tabIndex={-1}
          onChange={(evento) => {
            acrescentar(Array.from(evento.target.files ?? []))
            // Limpa para a mesma escolha poder ser feita de novo.
            evento.target.value = ''
          }}
        />
      </div>

      {arquivos.length > 0 && (
        <ul className={styles.lista} aria-label="Arquivos escolhidos">
          {arquivos.map((arquivo) => (
            <li key={chave(arquivo)} className={styles.item}>
              <span className={styles.nome}>{arquivo.name}</span>
              <span className={styles.tamanho}>
                {formatarTamanho(arquivo.size)}
              </span>
              <button
                type="button"
                className={styles.remover}
                onClick={() =>
                  onAlterar(arquivos.filter((atual) => atual !== arquivo))
                }
                disabled={desabilitado}
                aria-label={`Remover ${arquivo.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {recusados.length > 0 && (
        <ul className={styles.recusados} role="alert">
          {recusados.map((item) => (
            <li key={item.nome}>
              {item.nome}: {item.motivo}
            </li>
          ))}
        </ul>
      )}

      {onUsarLink && (
        <p className={styles.alternativa}>
          O material está na internet?{' '}
          <button
            type="button"
            className={styles.escolher}
            onClick={onUsarLink}
            disabled={desabilitado}
          >
            Cadastrar um link
          </button>
        </p>
      )}
    </div>
  )
}

function chave(arquivo: File): string {
  return `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}`
}

function mesmoArquivo(a: File, b: File): boolean {
  return chave(a) === chave(b)
}

function UploadIcon() {
  return (
    <svg
      className={styles.icone}
      width="22"
      height="22"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5M4 13v2a1 1 0 001 1h10a1 1 0 001-1v-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
