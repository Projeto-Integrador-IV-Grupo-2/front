import { REGRAS_SENHA } from '../../utils/regrasSenha.ts'
import styles from './RegrasSenha.module.css'

/**
 * Regras da senha com o estado de cada uma, atualizado enquanto a pessoa
 * digita. O texto "atendida"/"pendente" vai para o leitor de tela; o ícone é
 * só visual.
 */
export function RegrasSenha({ senha, id }: { senha: string; id?: string }) {
  return (
    <ul id={id} className={styles.regras} aria-label="Regras da senha">
      {REGRAS_SENHA.map((regra) => {
        const atendida = regra.atende(senha)
        return (
          <li
            key={regra.id}
            className={atendida ? styles.atendida : styles.pendente}
          >
            <span aria-hidden="true" className={styles.marca}>
              {atendida ? '✓' : '•'}
            </span>
            {regra.texto}
            <span className="visually-hidden">
              {atendida ? ' (atendida)' : ' (pendente)'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
