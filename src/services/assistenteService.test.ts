import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import {
  apagarSessao,
  AssistenteServiceError,
  criarSessao,
  enviarMensagem,
  listarMensagens,
  listarSessoes,
  MENSAGEM_CONVERSA_NAO_ENCONTRADA,
  MENSAGEM_IA_INDISPONIVEL,
  MENSAGEM_LIMITE_DE_PERGUNTAS,
  renomearSessao,
  tituloDaPergunta,
} from './assistenteService.ts'
import { reiniciarAssistenteMock } from './mocks/assistenteMock.ts'
import { criarPagina, criarSessaoAssistente } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'

const ID = 'c0000000-0000-4000-8000-000000000001'

async function erroDe(
  promessa: Promise<unknown>,
): Promise<AssistenteServiceError> {
  try {
    await promessa
  } catch (causa) {
    expect(causa).toBeInstanceOf(AssistenteServiceError)
    return causa as AssistenteServiceError
  }
  throw new Error('a chamada deveria ter falhado')
}

describe('assistenteService', () => {
  it('lista as conversas paginadas, da mais recente para a mais antiga', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/assistente/sessoes', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(
          criarPagina([criarSessaoAssistente()], { number: 2 }),
        )
      }),
    )

    const pagina = await listarSessoes({ page: 2 })

    expect(pagina.content[0].titulo).toBe('Onde fica a política de reembolso?')
    expect(url!.searchParams.get('page')).toBe('2')
    expect(url!.searchParams.get('size')).toBe('20')
    expect(url!.searchParams.get('sort')).toBe('atualizadoEm,desc')
  })

  it('abre uma conversa trazendo as mensagens', async () => {
    const mensagens = await listarMensagens(ID)

    expect(mensagens.map((m) => m.papel)).toEqual(['USUARIO', 'ASSISTENTE'])
    expect(mensagens[1].fontes).toContain(
      'Política de Reembolso v3 · Atendimento',
    )
  })

  it('conversa de outro usuário (404) vira "conversa não encontrada"', async () => {
    server.use(
      http.get('*/api/assistente/sessoes/:id/mensagens', () =>
        HttpResponse.json(
          { message: `Sessão não encontrada: ${ID}` },
          { status: 404 },
        ),
      ),
    )

    const erro = await erroDe(listarMensagens(ID))

    expect(erro.status).toBe(404)
    expect(erro.message).toBe(MENSAGEM_CONVERSA_NAO_ENCONTRADA)
  })

  it('renomeia mandando só o título novo', async () => {
    let corpo: unknown = null
    server.use(
      http.patch(
        '*/api/assistente/sessoes/:id',
        async ({ request, params }) => {
          corpo = await request.json()
          return HttpResponse.json(
            criarSessaoAssistente({
              id: String(params.id),
              titulo: 'Reembolso',
            }),
          )
        },
      ),
    )

    const sessao = await renomearSessao(ID, 'Reembolso')

    expect(corpo).toEqual({ titulo: 'Reembolso' })
    expect(sessao.titulo).toBe('Reembolso')
  })

  it('apaga a conversa', async () => {
    let apagada: string | null = null
    server.use(
      http.delete('*/api/assistente/sessoes/:id', ({ params }) => {
        apagada = String(params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await apagarSessao(ID)

    expect(apagada).toBe(ID)
  })

  it('erro do servidor ao apagar não vaza a mensagem técnica', async () => {
    server.use(
      http.delete('*/api/assistente/sessoes/:id', () =>
        HttpResponse.json({ message: 'NullPointerException' }, { status: 500 }),
      ),
    )

    const erro = await erroDe(apagarSessao(ID))

    expect(erro.message).not.toContain('NullPointer')
  })

  it('limite de perguntas por minuto (429) tem texto próprio', async () => {
    server.use(
      http.post('*/api/assistente/sessoes/:id/mensagens', () =>
        HttpResponse.json(
          { message: 'Too Many Requests' },
          { status: 429, headers: { 'Retry-After': '60' } },
        ),
      ),
    )

    const erro = await erroDe(enviarMensagem(ID, 'Oi'))

    expect(erro.status).toBe(429)
    expect(erro.message).toBe(MENSAGEM_LIMITE_DE_PERGUNTAS)
  })

  it('IA fora do ar (503) tem texto próprio, diferente do erro genérico de servidor', async () => {
    server.use(
      http.post('*/api/assistente/sessoes/:id/mensagens', () =>
        HttpResponse.json({ message: 'IA indisponível' }, { status: 503 }),
      ),
    )

    const erro = await erroDe(enviarMensagem(ID, 'Oi'))

    expect(erro.status).toBe(503)
    expect(erro.message).toBe(MENSAGEM_IA_INDISPONIVEL)
  })

  it('cria a conversa e envia a pergunta', async () => {
    const sessao = await criarSessao('Como solicito férias?')
    const { pergunta, resposta } = await enviarMensagem(sessao.id, 'Oi')

    expect(pergunta.papel).toBe('USUARIO')
    expect(resposta.papel).toBe('ASSISTENTE')
  })

  it('o título de uma conversa nova é o começo da pergunta', () => {
    expect(tituloDaPergunta('  Como   solicito férias?  ')).toBe(
      'Como solicito férias?',
    )
    const longa = 'a'.repeat(200)
    expect(tituloDaPergunta(longa)).toHaveLength(80)
    expect(tituloDaPergunta(longa).endsWith('…')).toBe(true)
  })

  describe('com o mock ligado (sem backend)', () => {
    it('lista, abre, renomeia e apaga sem chamar a rede', async () => {
      vi.stubEnv('VITE_ASSISTENTE_MOCK', 'true')
      reiniciarAssistenteMock()

      const primeira = await listarSessoes()
      expect(primeira.content).toHaveLength(20)
      expect(primeira.page.totalPages).toBe(2)

      const nova = await criarSessao('Teste')
      await enviarMensagem(nova.id, 'Como solicito férias?')
      const topo = await listarSessoes({ page: 0, size: 1 })
      expect(topo.content[0].id).toBe(nova.id)

      const mensagens = await listarMensagens(nova.id)
      expect(mensagens[1].fontes[0]).toMatch(/Benefícios/)

      await renomearSessao(nova.id, 'Férias')
      expect((await listarSessoes({ size: 1 })).content[0].titulo).toBe(
        'Férias',
      )

      await apagarSessao(nova.id)
      expect((await erroDe(listarMensagens(nova.id))).status).toBe(404)

      reiniciarAssistenteMock()
    })
  })
})
