import { useAuth } from '../hooks/useAuth.ts'
import styles from './DashboardPage.module.css'

function saudacaoPeloHorario(): string {
  const hora = new Date().getHours()
  if (hora < 12) {
    return 'Bom dia'
  }
  if (hora < 18) {
    return 'Boa tarde'
  }
  return 'Boa noite'
}

function dataDeHoje(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

/**
 * Conteúdo ilustrativo: estes números e listas não vêm de nenhuma API ainda.
 * Conhecimento, trilhas, pessoas e IA são áreas de outros cards — isto só
 * reproduz a estrutura visual do protótipo da Visão geral.
 */
const INDICADORES = [
  { valor: '214', rotulo: 'Colaboradores ativos' },
  { valor: '12', rotulo: 'Trilhas em andamento' },
  { valor: '168', rotulo: 'Conteúdos na base' },
  { valor: '78%', rotulo: 'Conclusão média' },
]

const PRECISA_DE_ATENCAO = [
  {
    titulo: '8 colaboradores estão atrasados na trilha Onboarding Comercial',
    meta: 'ATRASO · 5+ DIAS',
    severidade: 'alta',
  },
  {
    titulo: '3 conteúdos estão aguardando revisão',
    meta: 'CONHECIMENTO',
    severidade: 'media',
  },
  {
    titulo: '12 dúvidas na IA sem conteúdo correspondente na base',
    meta: 'LACUNA DE CONHECIMENTO',
    severidade: 'media',
  },
  {
    titulo: 'PDI de Rafael Souza sem atualização há 45 dias',
    meta: 'PESSOAS',
    severidade: 'baixa',
  },
] as const

const ATIVIDADE_RECENTE = [
  {
    titulo: 'Ana Lima concluiu Atendimento ao Cliente',
    quando: 'há 12 minutos',
  },
  {
    titulo: 'Novo conteúdo publicado: Política de Reembolso v3',
    quando: 'há 40 minutos',
  },
  {
    titulo: 'Trilha Liderança 2026 atribuída a 6 pessoas',
    quando: 'hoje, 09:14',
  },
  {
    titulo: 'Diego Martins atualizou o catálogo de APIs internas',
    quando: 'ontem, 17:52',
  },
]

const TRILHAS_EM_ANDAMENTO = [
  {
    titulo: 'Onboarding Comercial',
    meta: '32 colaboradores · Vendas',
    progresso: 45,
  },
  {
    titulo: 'Liderança para novos gestores',
    meta: '14 colaboradores · Liderança',
    progresso: 68,
  },
]

const MAIS_CONSULTADO_NA_IA = [
  { pergunta: 'Como solicitar férias?', meta: '84 perguntas · 30 dias' },
]

export function DashboardPage() {
  const { user } = useAuth()
  const primeiroNome = user?.nomeCompleto.split(' ')[0] ?? ''

  return (
    <div className={styles.page}>
      {/* A barra superior do layout já mostra "Visão geral"; o h1 fica
          disponível para leitores de tela e testes sem repetir na tela. */}
      <h1 className="visually-hidden">Visão geral</h1>

      <div className={styles.greeting}>
        <h2 className={styles.greetingTitle}>
          {saudacaoPeloHorario()}, {primeiroNome}
        </h2>
        <p className={styles.hint}>
          Aqui está o que precisa da sua atenção hoje, {dataDeHoje()}.
        </p>
      </div>

      <div className={styles.stats}>
        {INDICADORES.map((item) => (
          <div key={item.rotulo} className={styles.statCard}>
            <p className={styles.statValue}>{item.valor}</p>
            <p className={styles.statLabel}>{item.rotulo}</p>
          </div>
        ))}
      </div>

      <div className={styles.columns}>
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Precisa de atenção</h3>
          <ul className={styles.attentionList}>
            {PRECISA_DE_ATENCAO.map((item) => (
              <li key={item.titulo} className={styles.attentionItem}>
                <span
                  className={`${styles.dot} ${styles[`dot${item.severidade}`]}`}
                  aria-hidden="true"
                />
                <span className={styles.attentionText}>
                  <span className={styles.attentionTitle}>{item.titulo}</span>
                  <span className={styles.attentionMeta}>{item.meta}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Atividade recente</h3>
          <ul className={styles.activityList}>
            {ATIVIDADE_RECENTE.map((item) => (
              <li key={item.titulo} className={styles.activityItem}>
                <span className={styles.activityTitle}>{item.titulo}</span>
                <span className={styles.activityMeta}>{item.quando}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className={styles.columns}>
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Trilhas em andamento</h3>
          <ul className={styles.tracksList}>
            {TRILHAS_EM_ANDAMENTO.map((item) => (
              <li key={item.titulo} className={styles.trackItem}>
                <span className={styles.trackText}>
                  <span className={styles.trackTitle}>{item.titulo}</span>
                  <span className={styles.trackMeta}>{item.meta}</span>
                </span>
                <span className={styles.progressTrack}>
                  <span
                    className={styles.progressFill}
                    style={{ width: `${item.progresso}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Mais consultado na IA</h3>
          <ul className={styles.aiList}>
            {MAIS_CONSULTADO_NA_IA.map((item) => (
              <li key={item.pergunta} className={styles.aiItem}>
                <span className={styles.aiQuestion}>{item.pergunta}</span>
                <span className={styles.aiMeta}>{item.meta}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
