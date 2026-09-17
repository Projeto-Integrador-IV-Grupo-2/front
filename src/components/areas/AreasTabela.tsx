import type { Area } from '../../types/area.ts'
import styles from './AreasTabela.module.css'

interface AreasTabelaProps {
  areas: Area[]
  /** `id` da área com operação de situação em voo, ou `null`. */
  situacaoEmAndamento: string | null
  onEditar: (area: Area) => void
  onAlterarSituacao: (area: Area) => void
}

/**
 * Tabela da listagem de áreas. Só apresenta: recebe os dados prontos e
 * devolve a intenção do usuário — nenhuma chamada HTTP mora aqui.
 *
 * Em telas estreitas a tabela vira cartões via CSS, com o rótulo de cada
 * coluna em `data-rotulo`, mesma marcação servindo desktop e mobile.
 */
export function AreasTabela({
  areas,
  situacaoEmAndamento,
  onEditar,
  onAlterarSituacao,
}: AreasTabelaProps) {
  return (
    <table className={styles.tabela}>
      <caption className="visually-hidden">Lista de áreas do tenant</caption>
      <thead>
        <tr>
          <th scope="col">Área</th>
          <th scope="col">Pessoas</th>
          <th scope="col">Conteúdos</th>
          <th scope="col">Situação</th>
          <th scope="col">
            <span className="visually-hidden">Ações</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {areas.map((area) => {
          const emAndamento = situacaoEmAndamento === area.id

          return (
            <tr key={area.id}>
              <td data-rotulo="Área">{area.nome}</td>
              <td data-rotulo="Pessoas">{area.totalPessoas}</td>
              <td data-rotulo="Conteúdos">{area.totalConteudos}</td>
              <td data-rotulo="Situação">
                <span
                  className={area.ativo ? styles.seloAtivo : styles.seloInativo}
                >
                  {area.ativo ? 'Ativa' : 'Inativa'}
                </span>
              </td>
              <td data-rotulo="Ações" className={styles.acoes}>
                {/* O nome entra no aria-label porque "Editar" se repete em
                    cada linha: sem ele a lista de botões do leitor de tela
                    não diz qual área cada ação afeta. */}
                <button
                  type="button"
                  className={styles.secundario}
                  onClick={() => onEditar(area)}
                  aria-label={`Editar ${area.nome}`}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className={area.ativo ? styles.perigo : styles.secundario}
                  onClick={() => onAlterarSituacao(area)}
                  disabled={emAndamento}
                  aria-label={`${area.ativo ? 'Inativar' : 'Reativar'} ${area.nome}`}
                >
                  {area.ativo ? 'Inativar' : 'Reativar'}
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
