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
  const descricaoPainel = podeVerPainelGestao
    ? 'Acompanhe os indicadores das trilhas da sua empresa.'
    : 'Veja seu progresso e as próximas atividades de aprendizagem.'

  return (
    <div className={styles.page}>
      <h1 className="visually-hidden">Visão geral</h1>
      <header className={styles.greeting}>
        <h2 className={styles.greetingTitle}>
          {saudacaoPeloHorario()}, {primeiroNome}
        </h2>
        <p className={styles.hint}>
          {descricaoPainel} {dataDeHoje()}.
        </p>
      </header>

      {podeVerPainelColaborador && <DashboardColaborador />}
      {podeVerPainelGestao && <DashboardGestao />}
      {!podeVerPainelColaborador && !podeVerPainelGestao && (
        <p className={styles.roleError} role="alert">
          Não foi possível identificar um perfil autorizado para esta visão
          geral.
        </p>
      )}
    </div>
  )
}
