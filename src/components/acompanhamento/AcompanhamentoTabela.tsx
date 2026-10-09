import type { AtribuicaoAcompanhamento } from '../../types/atribuicao.ts'
import { formatarDataCurta } from '../trilhas/formatacao.ts'
import { BarraProgresso, SeloStatus } from '../trilhas/StatusProgresso.tsx'
import styles from './AcompanhamentoTabela.module.css'

interface AcompanhamentoTabelaProps {
  atribuicoes: AtribuicaoAcompanhamento[]
  onAbrirColaborador: (atribuicao: AtribuicaoAcompanhamento) => void
}

/**
 * Colaborador × trilha × status × prazo × percentual. Só apresenta: a página
 * busca os dados. Linhas atrasadas ganham destaque visual e o selo de status
 * diz "Atrasada" em texto, para não depender só da cor.
 *
 * Em telas estreitas a tabela vira cartões via CSS, com o rótulo de cada
 * coluna em `data-rotulo` — a mesma marcação serve desktop e celular.
 */
export function AcompanhamentoTabela({
  atribuicoes,
  onAbrirColaborador,
}: AcompanhamentoTabelaProps) {
  return (
    <table className={styles.tabela}>
      <caption className="visually-hidden">
        Andamento das trilhas por colaborador
      </caption>
      <thead>
        <tr>
          <th scope="col">Colaborador</th>
          <th scope="col">Área</th>
          <th scope="col">Trilha</th>
          <th scope="col">Status</th>
          <th scope="col">Prazo</th>
          <th scope="col">Progresso</th>
        </tr>
      </thead>
      <tbody>
        {atribuicoes.map((atribuicao) => {
          const atrasada = atribuicao.status === 'ATRASADA'
          const { colaborador, trilha } = atribuicao
          return (
            <tr
              key={atribuicao.id}
              className={atrasada ? styles.atrasada : undefined}
            >
              <td data-rotulo="Colaborador">
                <button
                  type="button"
                  className={styles.colaborador}
                  onClick={() => onAbrirColaborador(atribuicao)}
                  aria-label={`Ver trilhas de ${colaborador.nomeCompleto}`}
                >
                  <span className={styles.nome}>
                    {colaborador.nomeCompleto}
                  </span>
                  <span className={styles.email}>{colaborador.email}</span>
                </button>
              </td>
              <td data-rotulo="Área">{atribuicao.area?.nome ?? '—'}</td>
              <td data-rotulo="Trilha">{trilha.nome}</td>
              <td data-rotulo="Status">
                <SeloStatus status={atribuicao.status} />
              </td>
              <td
                data-rotulo="Prazo"
                className={atrasada ? styles.prazoVencido : undefined}
              >
                {atribuicao.prazo ? formatarDataCurta(atribuicao.prazo) : '—'}
              </td>
              <td data-rotulo="Progresso" className={styles.progresso}>
                <BarraProgresso
                  percentual={atribuicao.percentual}
                  rotulo={`Progresso de ${colaborador.nomeCompleto} em ${trilha.nome}`}
                />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
