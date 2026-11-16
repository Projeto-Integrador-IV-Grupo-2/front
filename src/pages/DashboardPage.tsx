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
  // Textos do protótipo: a gestão vê o que pede atenção; o colaborador, o
  // que tem para fazer.
  const descricaoPainel = podeVerPainelGestao
    ? `Aqui está o que precisa da sua atenção hoje, ${dataDeHoje()}.`
    : 'Veja seu progresso e o que você precisa fazer agora.'

  // A saudação entra no topo de cada painel, ao lado do selo de pendências
  // que só o painel conhece.
  const saudacao = (
    <header className={styles.greeting}>
      <h2 className={styles.greetingTitle}>
        {saudacaoPeloHorario()}, {primeiroNome}
      </h2>
      <p className={styles.hint}>{descricaoPainel}</p>
    </header>
  )

  return (
    <div className={styles.page}>
      <h1 className="visually-hidden">Dashboard</h1>

      {podeVerPainelColaborador && <DashboardColaborador saudacao={saudacao} />}
      {podeVerPainelGestao && <DashboardGestao saudacao={saudacao} />}
      {!podeVerPainelColaborador && !podeVerPainelGestao && (
        <>
          {saudacao}
          <p className={styles.roleError} role="alert">
            Não foi possível identificar um perfil autorizado para esta visão
            geral.
          </p>
        </>
      )}
    </div>
  )
}
