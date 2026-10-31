import { useRef, type KeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MeuPdi } from '../components/pdi/MeuPdi.tsx'
import { PdisEquipe } from '../components/pdi/PdisEquipe.tsx'
import { usePermissao } from '../hooks/usePermissao.ts'
import { ROTAS } from '../routes/paths.ts'
import { PERFIS_ESTUDO, PERFIS_GESTAO_PDI } from '../routes/permissions.ts'
import styles from './PdiPage.module.css'

type Aba = 'meu' | 'equipe'

const ROTULOS: Record<Aba, string> = {
  meu: 'Meu PDI',
  equipe: 'PDIs da equipe',
}

/**
 * PDI dentro de Trilhas (`/trilhas/pdi`), sem item próprio no menu.
 *
 * "Meu PDI" é de quem estuda (colaborador); "PDIs da equipe", de quem monta
 * PDIs (ADMIN e GESTOR). Quem tivesse as duas permissões veria as duas abas;
 * a aba fica na URL (`?aba=equipe`) para o "voltar" do editor cair nela.
 */
export function PdiPage() {
  const podeGerir = usePermissao(PERFIS_GESTAO_PDI)
  const estuda = usePermissao(PERFIS_ESTUDO)
  const [parametros, setParametros] = useSearchParams()
  const abas: Aba[] = [
    ...(estuda ? (['meu'] as const) : []),
    ...(podeGerir ? (['equipe'] as const) : []),
  ]
  const pedida = parametros.get('aba') === 'equipe' ? 'equipe' : 'meu'
  // Aba pedida que a pessoa não tem (ex.: colaborador com ?aba=equipe) cai na
  // primeira que ela tem.
  const ativa: Aba = abas.includes(pedida) ? pedida : (abas[0] ?? 'meu')
  const refs = useRef<Partial<Record<Aba, HTMLButtonElement | null>>>({})

  function selecionar(aba: Aba) {
    setParametros(aba === 'meu' ? {} : { aba }, { replace: true })
  }

  // Setas trocam de aba, como pede o padrão de abas do WAI-ARIA.
  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') {
      return
    }
    const indice = abas.indexOf(ativa)
    const passo = evento.key === 'ArrowRight' ? 1 : -1
    const proxima = abas[(indice + passo + abas.length) % abas.length]
    selecionar(proxima)
    refs.current[proxima]?.focus()
  }

  return (
    <div className={styles.page}>
      <Link to={ROTAS.trilhas} className={styles.voltar}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path
            d="M8.5 3L4.5 7l4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Voltar para trilhas
      </Link>

      <header>
        <h1 className={styles.titulo}>PDI</h1>
        <p className={styles.hint}>
          Plano de Desenvolvimento Individual: competências a desenvolver e as
          trilhas ligadas a cada uma.
        </p>
      </header>

      {abas.length > 1 && (
        <div
          role="tablist"
          aria-label="Visões do PDI"
          className={styles.abas}
          onKeyDown={aoTeclar}
        >
          {abas.map((aba) => (
            <button
              key={aba}
              ref={(elemento) => {
                refs.current[aba] = elemento
              }}
              id={`aba-${aba}`}
              type="button"
              role="tab"
              aria-selected={aba === ativa}
              aria-controls={`painel-${aba}`}
              tabIndex={aba === ativa ? 0 : -1}
              className={styles.aba}
              onClick={() => selecionar(aba)}
            >
              {ROTULOS[aba]}
            </button>
          ))}
        </div>
      )}

      <div
        id={`painel-${ativa}`}
        role={abas.length > 1 ? 'tabpanel' : undefined}
        aria-labelledby={abas.length > 1 ? `aba-${ativa}` : undefined}
        className={styles.painel}
      >
        {ativa === 'meu' ? <MeuPdi /> : <PdisEquipe />}
      </div>
    </div>
  )
}
