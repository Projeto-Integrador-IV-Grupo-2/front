import { useAuth } from '../hooks/useAuth.ts'
import { usePermissao } from '../hooks/usePermissao.ts'
import { DashboardColaborador } from '../components/dashboard/DashboardColaborador.tsx'
import { DashboardGestao } from '../components/dashboard/DashboardGestao.tsx'
import styles from './DashboardPage.module.css'

function saudacaoPeloHorario(): string {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function dataDeHoje(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

export function DashboardPage() {
  const { user } = useAuth()
  // A seleção usa a regra central de permissão, sem comparar o papel
  // diretamente nem tentar autorizar dados no cliente.
  const podeVerPainelColaborador = usePermissao(['COLABORADOR'])
  const podeVerPainelGestao = usePermissao(['ADMIN', 'GESTOR'])
  const primeiroNome = user?.nomeCompleto.split(' ')[0] ?? ''

  // A saudação entra no topo de cada painel; o subtítulo é montado pelo
  // painel com os números que ele carregou (nada fixo).
  const saudacao = (descricao: string) => (
    <header className={styles.greeting}>
      <h2 className={styles.greetingTitle}>
        {saudacaoPeloHorario()}, {primeiroNome}
      </h2>
      <p className={styles.hint}>{descricao}</p>
    </header>
  )

  return (
    <div className={styles.page}>
      <h1 className="visually-hidden">Dashboard</h1>

      {podeVerPainelColaborador && <DashboardColaborador saudacao={saudacao} />}
      {podeVerPainelGestao && <DashboardGestao saudacao={saudacao} />}
      {!podeVerPainelColaborador && !podeVerPainelGestao && (
        <>
          {saudacao(`Hoje é ${dataDeHoje()}.`)}
          <p className={styles.roleError} role="alert">
            Não foi possível identificar um perfil autorizado para esta visão
            geral.
          </p>
        </>
      )}
    </div>
  )
}
