import type { Area } from '../../types/area.ts'
import { MenuOpcoes } from '../comum/MenuOpcoes.tsx'
import styles from './AreasTabela.module.css'

interface AreasTabelaProps {
  areas: Area[]
  /** `id` da área com operação de situação em voo, ou `null`. */
  situacaoEmAndamento: string | null
  /**
   * Libera as ações de editar/inativar/reativar. A checagem de perfil é
   * inteira da página (via `usePermissao`) — a tabela só obedece.
   */
  podeGerenciar: boolean
  onEditar: (area: Area) => void
  onAlterarSituacao: (area: Area) => void
  /** Abre as trilhas da área — disponível para qualquer perfil. */
  onVerTrilhas: (area: Area) => void
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
  podeGerenciar,
  onEditar,
  onAlterarSituacao,
  onVerTrilhas,
}: AreasTabelaProps) {
  return (
    <div className={styles.rolagem}>
      <table className={styles.tabela}>
        <caption className="visually-hidden">Lista de áreas do tenant</caption>
        <thead>
          <tr>
            <th scope="col">Área</th>
            <th scope="col">Pessoas</th>
            <th scope="col">Conteúdos</th>
            <th scope="col">Situação</th>
            <th scope="col">Trilhas</th>
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
                    className={
                      area.ativo ? styles.seloAtivo : styles.seloInativo
                    }
                  >
                    {area.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td data-rotulo="Trilhas">
                  <button
                    type="button"
                    className={styles.link}
                    onClick={() => onVerTrilhas(area)}
                    aria-label={`Ver trilhas de ${area.nome}`}
                  >
                    Ver trilhas
                  </button>
                </td>
                <td data-rotulo="Ações" className={styles.acoes}>
                  {/* Colaborador não tem essas ações — nem o botão aparece
                    (Card 14 / issue #31). A fonte de verdade continua o
                    backend: um 403 vindo da API ainda seria tratado pela
                    página, mesmo que a UI já devesse ter escondido isto. */}
                  {podeGerenciar && (
                    // O nome entra no rótulo do "⋯" porque ele se repete em
                    // cada linha: o leitor de tela diz de qual área é.
                    <MenuOpcoes
                      rotulo={`Opções de ${area.nome}`}
                      opcoes={[
                        { rotulo: 'Editar', aoEscolher: () => onEditar(area) },
                        {
                          rotulo: area.ativo ? 'Desativar' : 'Reativar',
                          aoEscolher: () => onAlterarSituacao(area),
                          perigo: area.ativo,
                          desabilitada: emAndamento,
                        },
                      ]}
                    />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
