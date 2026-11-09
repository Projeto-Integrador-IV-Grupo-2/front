import {
  ROTULOS_PERFIL,
  ROTULOS_SITUACAO,
  type Usuario,
} from '../../types/usuario.ts'
import { MenuOpcoes } from '../comum/MenuOpcoes.tsx'
import styles from './UsuariosTabela.module.css'

interface UsuariosTabelaProps {
  usuarios: Usuario[]
  /** `id` do usuário com operação de situação em voo, ou `null`. */
  situacaoEmAndamento: string | null
  onEditar: (usuario: Usuario) => void
  onAlterarSituacao: (usuario: Usuario) => void
}

/** Data ISO (`LocalDate` da API) no formato brasileiro, sem passar por fuso. */
function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso
}

/**
 * Tabela da listagem. Só apresenta: recebe os dados prontos e devolve a
 * intenção do administrador — nenhuma chamada HTTP mora aqui.
 *
 * Em telas estreitas a tabela vira cartões via CSS, com o rótulo de cada
 * coluna em `data-rotulo`, então a mesma marcação serve desktop e mobile.
 */
export function UsuariosTabela({
  usuarios,
  situacaoEmAndamento,
  onEditar,
  onAlterarSituacao,
}: UsuariosTabelaProps) {
  return (
    <div className={styles.rolagem}>
      <table className={styles.tabela}>
        <caption className="visually-hidden">
          Lista de usuários do tenant
        </caption>
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">E-mail</th>
            <th scope="col">Área</th>
            <th scope="col">Perfil</th>
            <th scope="col">Situação</th>
            <th scope="col">Entrada</th>
            <th scope="col">
              <span className="visually-hidden">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) => {
            const ativo = usuario.situacao === 'ATIVO'
            const emAndamento = situacaoEmAndamento === usuario.id

            return (
              <tr key={usuario.id}>
                <td data-rotulo="Nome">{usuario.nomeCompleto}</td>
                <td data-rotulo="E-mail">{usuario.email}</td>
                <td data-rotulo="Área">{usuario.area?.nome ?? '—'}</td>
                <td data-rotulo="Perfil">{ROTULOS_PERFIL[usuario.papel]}</td>
                <td data-rotulo="Situação">
                  <span
                    className={ativo ? styles.seloAtivo : styles.seloInativo}
                  >
                    {ROTULOS_SITUACAO[usuario.situacao]}
                  </span>
                </td>
                <td data-rotulo="Entrada">
                  {formatarData(usuario.dataEntrada)}
                </td>
                <td data-rotulo="Ações" className={styles.acoes}>
                  {/* Um botão de opções por linha; o nome entra no rótulo porque
                    ele se repete em cada linha da tabela. */}
                  <MenuOpcoes
                    rotulo={`Opções de ${usuario.nomeCompleto}`}
                    opcoes={[
                      { rotulo: 'Editar', aoEscolher: () => onEditar(usuario) },
                      {
                        rotulo: ativo ? 'Desativar' : 'Reativar',
                        aoEscolher: () => onAlterarSituacao(usuario),
                        perigo: ativo,
                        desabilitada: emAndamento,
                      },
                    ]}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
