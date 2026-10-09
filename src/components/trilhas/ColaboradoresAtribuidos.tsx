import { Link } from 'react-router-dom'
import { ROTAS } from '../../routes/paths.ts'
import type { AtribuicaoAcompanhamento } from '../../types/atribuicao.ts'
import { formatarDataCurta } from './formatacao.ts'
import { BarraProgresso, SeloStatus } from './StatusProgresso.tsx'
import styles from './ColaboradoresAtribuidos.module.css'

interface ColaboradoresAtribuidosProps {
  /** `null` enquanto a busca está em voo. */
  atribuicoes: AtribuicaoAcompanhamento[] | null
  /** Quantos existem ao todo — pode ser maior do que o que cabe na página. */
  total: number
  erro: string | null
  onTentarNovamente: () => void
}

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * "Colaboradores atribuídos" do protótipo: quem recebeu a trilha, com o
 * progresso e a situação de cada um. Só apresenta — a página busca os dados,
 * como no resto da tela.
 *
 * É um recorte da tela de Acompanhamento, que mostra o mesmo dado para todas
 * as trilhas; por isso lê do mesmo endpoint e reusa o selo e a barra. Linha
 * atrasada ganha destaque, e o selo diz "Atrasada" em texto para não depender
 * só da cor.
 */
export function ColaboradoresAtribuidos({
  atribuicoes,
  total,
  erro,
  onTentarNovamente,
}: ColaboradoresAtribuidosProps) {
  if (erro) {
    return (
      <div className={styles.painel}>
        <p className={styles.erro} role="alert">
          {erro}
        </p>
        <button
          type="button"
          className={styles.tentar}
          onClick={onTentarNovamente}
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (atribuicoes === null) {
    return (
      <div className={styles.painel} aria-busy="true">
        <p role="status" className={styles.vazio}>
          Carregando colaboradores…
        </p>
      </div>
    )
  }

  if (atribuicoes.length === 0) {
    return (
      <div className={styles.painel}>
        <p className={styles.vazio}>
          Ninguém recebeu esta trilha ainda. Use “Atribuir colaboradores” para
          começar.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.painel}>
      <table className={styles.tabela}>
        <caption className="visually-hidden">
          Colaboradores que receberam esta trilha
        </caption>
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Progresso</th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          {atribuicoes.map((atribuicao) => {
            const atrasada = atribuicao.status === 'ATRASADA'
            const { colaborador } = atribuicao
            return (
              <tr
                key={atribuicao.id}
                className={atrasada ? styles.atrasada : undefined}
              >
                <td data-rotulo="Nome">
                  <span className={styles.pessoa}>
                    <span className={styles.avatar} aria-hidden="true">
                      {iniciais(colaborador.nomeCompleto)}
                    </span>
                    <span className={styles.nome}>
                      {colaborador.nomeCompleto}
                      {atribuicao.prazo && (
                        <span
                          className={
                            atrasada ? styles.prazoVencido : styles.prazo
                          }
                        >
                          {atrasada ? 'venceu em ' : 'prazo '}
                          {formatarDataCurta(atribuicao.prazo)}
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                <td data-rotulo="Progresso">
                  <BarraProgresso
                    percentual={atribuicao.percentual}
                    rotulo={`Progresso de ${colaborador.nomeCompleto}`}
                    semValor
                  />
                </td>
                <td data-rotulo="Situação">
                  <SeloStatus status={atribuicao.status} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {total > atribuicoes.length && (
        <p className={styles.rodape}>
          Mostrando {atribuicoes.length} de {total}.{' '}
          <Link to={ROTAS.acompanhamento}>Ver no acompanhamento</Link>
        </p>
      )}
    </div>
  )
}
