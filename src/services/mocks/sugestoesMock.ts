import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios'
import { assinarEventosTrilha } from '../eventosTrilha.ts'
import type {
  CriarTrilhaRequest,
  RespostaAjudaTrilhas,
  SugestoesTrilhas,
  TrilhaResumo,
} from '../../types/trilha.ts'

/**
 * Mock da IA na tela de Trilhas. É um *adapter* do Axios, como os outros
 * mocks: o `trilhaService` faz as mesmas chamadas e só troca quem responde.
 *
 * - `POST /api/trilhas/sugestoes/ajuda` (a conversa) ainda não existe no
 *   backend, então responde por aqui por padrão (`VITE_AJUDA_IA_MOCK`): por
 *   palavra-chave e, quando a pergunta é para montar uma trilha, com um
 *   rascunho pronto.
 * - `GET /api/trilhas/sugestoes` já existe na API; o mock só entra com
 *   `VITE_SUGESTOES_MOCK=true` (ou `area`), para trabalhar sem o backend.
 *
 * As trilhas sugeridas saem do catálogo de verdade (a listagem de trilhas),
 * para o clique levar a um detalhe que existe. Só os motivos são fixos.
 */

const LATENCIA_MS = import.meta.env.MODE === 'test' ? 0 : 900
const QUANTIDADE = 3

const MOTIVOS_IA = [
  'Combina com a meta de comunicação do seu PDI e com o que pessoas com o mesmo cargo concluíram nos últimos meses.',
  'Você consultou conteúdos sobre este tema na IA três vezes nesta semana.',
  'Complementa a trilha que você está fazendo e prepara para a próxima avaliação do ciclo.',
]

function motivoPorArea(trilha: TrilhaResumo): string {
  return trilha.area
    ? `Trilha da área ${trilha.area.nome}.`
    : 'Trilha aberta a todas as áreas.'
}

/**
 * O backend de verdade já não devolve trilha iniciada; o mock não sabe disso
 * sozinho, então ouve o mesmo evento que a tela ouve.
 */
const iniciadas = new Set<string>()
assinarEventosTrilha((evento) => {
  if (evento.tipo === 'trilha-iniciada') {
    iniciadas.add(evento.trilhaId)
  }
})

function jaIniciada(trilha: TrilhaResumo): boolean {
  return (
    iniciadas.has(trilha.id) ||
    (trilha.progresso != null && trilha.progresso.status !== 'NAO_INICIADA')
  )
}

/** `VITE_SUGESTOES_MOCK=area` simula a IA fora do ar (recomendação por área). */
function iaForaDoAr(): boolean {
  return import.meta.env.VITE_SUGESTOES_MOCK === 'area'
}

/** Mesmo formato do `SugestoesDeTrilhaResponse` da API. */
function sugestoesDe(catalogo: TrilhaResumo[]): SugestoesTrilhas {
  const porArea = iaForaDoAr()
  return {
    geradoPorIa: !porArea,
    aviso: porArea
      ? 'Não foi possível gerar as sugestões com a IA agora. Estas são as trilhas da sua área.'
      : null,
    sugestoes: catalogo
      .filter((trilha) => !jaIniciada(trilha))
      .slice(0, QUANTIDADE)
      .map((trilha, indice) => ({
        id: trilha.id,
        nome: trilha.nome,
        area: trilha.area,
        objetivos: trilha.objetivos ?? null,
        motivo: porArea
          ? motivoPorArea(trilha)
          : MOTIVOS_IA[indice % MOTIVOS_IA.length],
      })),
  }
}

interface ModeloTrilha {
  chaves: RegExp
  rascunho: CriarTrilhaRequest
}

/** Rascunhos prontos por tema; a área fica para quem cadastra escolher. */
const MODELOS: ModeloTrilha[] = [
  {
    chaves: /(onboarding|integra[çc][ãa]o|novos? colaborador|boas-vindas)/,
    rascunho: {
      nome: 'Onboarding: primeiros 30 dias',
      descricao:
        'Apresenta a empresa, a cultura, as ferramentas do dia a dia e as pessoas-chave, para o novo colaborador ganhar autonomia no primeiro mês.',
      areaId: null,
      prazoDias: 30,
      objetivos:
        'Conhecer a empresa e as políticas internas; usar as ferramentas do time; saber a quem pedir ajuda.',
    },
  },
  {
    chaves: /(atendimento|cliente|reclama|suporte|sac)/,
    rascunho: {
      nome: 'Excelência no atendimento ao cliente',
      descricao:
        'Da escuta ativa à resolução de conflitos: técnicas para atender bem, seguir a Política de Reembolso e manter a calma em conversas difíceis.',
      areaId: null,
      prazoDias: 21,
      objetivos:
        'Aplicar escuta ativa; resolver reclamações no primeiro contato; conhecer a Política de Reembolso v3.',
    },
  },
  {
    chaves: /(venda|comercial|negocia|proposta|funil)/,
    rascunho: {
      nome: 'Negociação e processo comercial',
      descricao:
        'As 6 etapas do processo comercial, como montar uma proposta e negociar descontos dentro da política.',
      areaId: null,
      prazoDias: 30,
      objetivos:
        'Dominar o funil comercial; montar propostas aprovadas de primeira; negociar sem passar de 12% de desconto.',
    },
  },
  {
    chaves: /(lgpd|dado|privacidade|compliance|seguran[çc]a)/,
    rascunho: {
      nome: 'LGPD na prática',
      descricao:
        'O que são dados pessoais e sensíveis, como tratá-los no dia a dia e o que fazer em caso de incidente.',
      areaId: null,
      prazoDias: 14,
      objetivos:
        'Identificar dados sensíveis; comunicar incidentes em até 24h; passar na avaliação de LGPD.',
    },
  },
]

const QUER_CRIAR = /(cri|mont|nova trilha|rascunho|estrutur|planej)/

function responderAjuda(
  pergunta: string,
  catalogo: TrilhaResumo[],
): RespostaAjudaTrilhas {
  const s = pergunta.toLowerCase()
  const modelo = MODELOS.find((m) => m.chaves.test(s))

  if (QUER_CRIAR.test(s) || (modelo && /trilha/.test(s))) {
    // O mock não conhece os conteúdos publicados: a trilha vem sem etapas.
    const rascunho = {
      ...(modelo ?? MODELOS[0]).rascunho,
      etapas: [],
      conteudosFaltando: [],
    }
    return {
      texto: `Montei um rascunho para a trilha "${rascunho.nome}", com prazo de ${rascunho.prazoDias} dias. Revise os campos, escolha a área e ajuste o que precisar antes de salvar. Depois de criada, você adiciona as etapas no detalhe da trilha.`,
      rascunho,
    }
  }

  if (/(lacuna|falta|equipe|time|gap)/.test(s)) {
    return {
      texto:
        'Nos últimos 30 dias, 12 dúvidas feitas à IA não tiveram conteúdo correspondente na base — a maioria sobre reembolso e LGPD. Uma trilha sobre esses temas cobriria a lacuna; peça "monte uma trilha de LGPD" para eu preparar o rascunho.',
      rascunho: null,
    }
  }

  const disponiveis = sugestoesDe(catalogo).sugestoes
  if (disponiveis.length === 0) {
    return {
      texto:
        'Não encontrei trilhas novas para você agora. Se quiser, peça para eu montar uma trilha sobre um tema.',
      rascunho: null,
    }
  }
  const nomes = disponiveis.map((s) => `"${s.nome}"`).join(', ')
  return {
    texto: `Pelo seu PDI e pelo que você tem estudado, comece por ${nomes}. Elas estão em "Sugeridas para você", aqui no painel — é só clicar para ver o detalhe e iniciar.`,
    rascunho: null,
  }
}

function responder<T>(config: InternalAxiosRequestConfig, data: T) {
  return {
    data,
    status: 200,
    statusText: '200',
    headers: new AxiosHeaders(),
    config,
  }
}

function corpoDe(config: InternalAxiosRequestConfig): Record<string, unknown> {
  if (typeof config.data === 'string') {
    return JSON.parse(config.data) as Record<string, unknown>
  }
  return (config.data ?? {}) as Record<string, unknown>
}

/**
 * Recebe quem busca o catálogo, em vez de importar o `trilhaService`: assim
 * o service depende do mock, e não os dois um do outro.
 */
export function criarAdaptadorSugestoesMock(
  buscarCatalogo: () => Promise<TrilhaResumo[]>,
): AxiosAdapter {
  return (config: InternalAxiosRequestConfig) =>
    new Promise((resolve, reject) => {
      const pedindoAjuda = /\/ajuda$/.test(config.url ?? '')
      setTimeout(() => {
        buscarCatalogo()
          .then((catalogo) => {
            resolve(
              pedindoAjuda
                ? responder(
                    config,
                    responderAjuda(
                      String(corpoDe(config).pergunta ?? ''),
                      catalogo,
                    ),
                  )
                : responder(config, sugestoesDe(catalogo)),
            )
          })
          .catch((causa: unknown) => {
            reject(
              causa instanceof AxiosError
                ? causa
                : new AxiosError(
                    'Falha no mock de sugestões',
                    AxiosError.ERR_BAD_RESPONSE,
                    config,
                  ),
            )
          })
      }, LATENCIA_MS)
    })
}
