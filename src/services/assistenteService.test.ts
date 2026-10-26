import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  consultarAssistente,
  criarSessaoAssistente,
} from './assistenteService.ts'
import { server } from '../test/msw/server.ts'

const CRIADO_EM = '2026-10-26T12:00:00Z'

describe('assistenteService', () => {
  it('cria uma sessão compatível com SessaoResponse da API', async () => {
    const sessao = await criarSessaoAssistente()

    expect(sessao).toEqual({
      id: 'sessao-assistente-teste',
      contexto: 'CONHECIMENTO',
      titulo: 'Nova conversa',
      criadoEm: CRIADO_EM,
      atualizadoEm: CRIADO_EM,
    })
  })

  it('envia conteudo para /mensagens e retorna a troca e as fontes do DTO real', async () => {
    let corpoRecebido: unknown
    server.use(
      http.post(
        '*/api/assistente/sessoes/:sessaoId/mensagens',
        async ({ request }) => {
          corpoRecebido = await request.json()
          return HttpResponse.json({
            sessao: {
              id: 'sessao-1',
              contexto: 'CONHECIMENTO',
              titulo: 'Como solicito férias?',
              criadoEm: CRIADO_EM,
              atualizadoEm: '2026-10-26T12:00:01Z',
            },
            pergunta: {
              id: 'mensagem-pergunta-1',
              papel: 'USUARIO',
              conteudo: 'Como solicito férias?',
              fontes: [],
              criadoEm: '2026-10-26T12:00:01Z',
            },
            resposta: {
              id: 'mensagem-resposta-1',
              papel: 'ASSISTENTE',
              conteudo: 'Consulte a política de férias.',
              fontes: ['Política de férias'],
              criadoEm: '2026-10-26T12:00:01Z',
            },
          })
        },
      ),
    )

    const resposta = await consultarAssistente('sessao-1', {
      conteudo: 'Como solicito férias?',
    })

    expect(corpoRecebido).toEqual({ conteudo: 'Como solicito férias?' })
    expect(resposta.resposta.conteudo).toBe('Consulte a política de férias.')
    expect(resposta.resposta.fontes).toEqual(['Política de férias'])
    expect(resposta.pergunta.papel).toBe('USUARIO')
    expect(resposta.sessao.id).toBe('sessao-1')
  })

  it('normaliza indisponibilidade da IA (503)', async () => {
    server.use(
      http.post('*/api/assistente/sessoes/:sessaoId/mensagens', () =>
        HttpResponse.json({ message: 'Erro técnico interno' }, { status: 503 }),
      ),
    )

    await expect(
      consultarAssistente('sessao-1', { conteudo: 'Pergunta' }),
    ).rejects.toMatchObject({
      name: 'AssistenteServiceError',
      status: 503,
      message:
        'O assistente de IA está indisponível no momento. Tente novamente em instantes.',
    })
  })

  it('normaliza limite de perguntas (429)', async () => {
    server.use(
      http.post('*/api/assistente/sessoes/:sessaoId/mensagens', () =>
        HttpResponse.json({ message: 'Rate limit' }, { status: 429 }),
      ),
    )

    await expect(
      consultarAssistente('sessao-1', { conteudo: 'Pergunta' }),
    ).rejects.toMatchObject({
      name: 'AssistenteServiceError',
      status: 429,
      message:
        'Você atingiu o limite de perguntas. Aguarde um pouco antes de tentar novamente.',
    })
  })
})
