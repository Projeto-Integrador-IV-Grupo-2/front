import { useEffect, useState } from 'react'
import { buscarMeuPdi, PdiServiceError } from '../../services/pdiService.ts'
import type { PdiDetalhe } from '../../types/pdi.ts'
import { CompetenciaPdi } from './CompetenciaPdi.tsx'
import { PdiResumoPainel } from './PdiResumoPainel.tsx'
import estados from './Estados.module.css'

interface Resultado {
  chave: number
  pdi: PdiDetalhe | null
  erro: string | null
}

/**
 * Aba "Meu PDI": o PDI ativo de quem está logado, com competências, trilhas
 * ligadas, status, prazo e percentual. Busca de novo sempre que a aba monta —
 * concluir uma trilha e voltar para cá já mostra o percentual atualizado.
 */
export function MeuPdi() {
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const carregando = resultado?.chave !== recarga
  const atual = resultado?.chave === recarga ? resultado : null

  useEffect(() => {
    const controlador = new AbortController()
    buscarMeuPdi({ signal: controlador.signal })
      .then((pdi) => {
        if (!controlador.signal.aborted) {
          setResultado({ chave: recarga, pdi, erro: null })
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setResultado({
            chave: recarga,
            pdi: null,
            erro:
              causa instanceof PdiServiceError
                ? causa.message
                : 'Não foi possível carregar o seu PDI.',
          })
        }
      })
    return () => controlador.abort()
  }, [recarga])

  if (carregando) {
    return (
      <p role="status" className={estados.carregando}>
        Carregando o seu PDI…
      </p>
    )
  }

  if (atual?.erro) {
    return (
      <div className={estados.erro} role="alert">
        <p>{atual.erro}</p>
        <button type="button" onClick={() => setRecarga((n) => n + 1)}>
          Tentar novamente
        </button>
      </div>
    )
  }

  const pdi = atual?.pdi
  if (!pdi) {
    return (
      <div className={estados.vazio}>
        <p className={estados.vazioTitulo}>Você ainda não tem um PDI ativo</p>
        <p className={estados.vazioTexto}>
          Quando o seu gestor montar o seu plano de desenvolvimento, as
          competências e trilhas dele aparecem aqui.
        </p>
      </div>
    )
  }

  return (
    <>
      <PdiResumoPainel pdi={pdi} mostrar="gestor" />
      <section aria-labelledby="titulo-competencias">
        <h2 id="titulo-competencias" className={estados.secao}>
          Competências
        </h2>
        {pdi.itens.length === 0 ? (
          <p className={estados.vazioTexto}>
            O seu PDI ainda não tem competências.
          </p>
        ) : (
          <ul className={estados.lista}>
            {pdi.itens.map((item) => (
              <CompetenciaPdi key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
