import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { criarUsuario } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'
import { renderizarComProvedores } from '../test/renderWithProviders.tsx'
import {
  MENSAGEM_IA_INDISPONIVEL,
  MENSAGEM_LIMITE_DE_PERGUNTAS,
} from '../services/assistenteService.ts'

const ROTA_ASSISTENTE = '/assistente'
const TITULO_FONTE = 'Política de Férias'

function respostaDaApi(conteudo: string, fontes: string[] = []) {
  const criadoEm = '2026-10-26T12:00:01Z'
  return {
    sessao: {
      id: 'sessao-assistente-teste',
      contexto: 'CONHECIMENTO',
      titulo: conteudo.slice(0, 200),
      criadoEm: '2026-10-26T12:00:00Z',
      atualizadoEm: criadoEm,
    },
    pergunta: {
      id: 'pergunta-teste',
      papel: 'USUARIO',
      conteudo,
      fontes: [],
      criadoEm,
    },
    resposta: {
      id: 'resposta-teste',
      papel: 'ASSISTENTE',
      conteudo: 'Consulte a política interna para ver os detalhes.',
      fontes,
      criadoEm,
    },
  }
}

describe('AssistentePage', () => {
  it('mostra sugestões e deixa o item Assistente visível para colaborador', async () => {
    renderizarComProvedores({
      rota: ROTA_ASSISTENTE,
      usuario: criarUsuario({ papel: 'COLABORADOR' }),
    })

    expect(
      await screen.findByRole('heading', { name: 'Assistente de IA' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Assistente' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /Quais são as principais políticas da empresa/,
      }),
    ).toBeInTheDocument()
  })

  it('envia a pergunta e abre a fonte em Conhecimento', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/assistente/sessoes/:sessaoId/mensagens', () =>
        HttpResponse.json(
          respostaDaApi('Como solicito férias?', [TITULO_FONTE]),
        ),
      ),
      http.get('*/api/conteudos', ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get('titulo')).toBe(TITULO_FONTE)
        return HttpResponse.json({
          content: [
            {
              id: 'documento-42',
              titulo: TITULO_FONTE,
              descricao: null,
              tipo: 'DOCUMENTO',
              status: 'PUBLICADO',
              categoria: null,
              area: null,
              videoUrl: null,
              duracaoSegundos: null,
              miniaturaUrl: null,
              corpo: null,
              linkUrl: null,
              criadoEm: '2026-01-01T00:00:00Z',
              atualizadoEm: '2026-01-01T00:00:00Z',
              publicadoEm: '2026-01-01T00:00:00Z',
            },
          ],
          page: { size: 10, number: 0, totalElements: 1, totalPages: 1 },
        })
      }),
    )

    renderizarComProvedores({ rota: ROTA_ASSISTENTE, usuario: criarUsuario() })
    const campo = await screen.findByRole('textbox', {
      name: 'Escreva sua pergunta',
    })
    await user.type(campo, 'Como solicito férias?')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Como solicito férias?')).toBeInTheDocument()
    expect(
      await screen.findByText(
        'Consulte a política interna para ver os detalhes.',
      ),
    ).toBeInTheDocument()

    const linkFonte = screen.getByRole('link', { name: TITULO_FONTE })
    expect(linkFonte).toHaveAttribute(
      'href',
      '/conhecimento?titulo=Pol%C3%ADtica+de+F%C3%A9rias',
    )
    await user.click(linkFonte)
    expect(
      await screen.findByRole('heading', { name: 'Conhecimento' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('row', { name: /Política de Férias/ }),
    ).toBeInTheDocument()
  })

  it('mantém a pergunta e bloqueia novo envio enquanto a IA responde', async () => {
    const user = userEvent.setup()
    let liberarResposta: (() => void) | undefined
    let informarInicioConsulta: (() => void) | undefined
    const respostaPendente = new Promise<void>((resolve) => {
      liberarResposta = resolve
    })
    const consultaIniciada = new Promise<void>((resolve) => {
      informarInicioConsulta = resolve
    })

    server.use(
      http.post('*/api/assistente/sessoes/:sessaoId/mensagens', async () => {
        informarInicioConsulta?.()
        await respostaPendente
        return HttpResponse.json(respostaDaApi('Pergunta pendente'))
      }),
    )

    renderizarComProvedores({ rota: ROTA_ASSISTENTE, usuario: criarUsuario() })
    const campo = await screen.findByRole('textbox', {
      name: 'Escreva sua pergunta',
    })
    await user.type(campo, 'Pergunta pendente')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Pergunta pendente')).toBeInTheDocument()
    await consultaIniciada
    expect(await screen.findByRole('status')).toHaveTextContent(
      'O assistente está respondendo',
    )
    expect(campo).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()

    await waitFor(() => expect(liberarResposta).toBeDefined())
    liberarResposta?.()
    expect(
      await screen.findByText(
        'Consulte a política interna para ver os detalhes.',
      ),
    ).toBeInTheDocument()
    expect(campo).toHaveFocus()
  })

  it.each([
    {
      status: 503,
      mensagem: MENSAGEM_IA_INDISPONIVEL,
    },
    {
      status: 429,
      mensagem: MENSAGEM_LIMITE_DE_PERGUNTAS,
    },
  ])(
    'mostra mensagem amigável e permite nova tentativa no erro $status',
    async ({ status, mensagem }) => {
      const user = userEvent.setup()
      let falhar = true
      server.use(
        http.post('*/api/assistente/sessoes/:sessaoId/mensagens', () => {
          if (falhar) {
            return HttpResponse.json({ message: 'Erro técnico' }, { status })
          }
          return HttpResponse.json(
            respostaDaApi('Minha pergunta continua aqui'),
          )
        }),
      )

      renderizarComProvedores({
        rota: ROTA_ASSISTENTE,
        usuario: criarUsuario(),
      })
      const campo = await screen.findByRole('textbox', {
        name: 'Escreva sua pergunta',
      })
      await user.type(campo, 'Minha pergunta continua aqui')
      await user.keyboard('{Enter}')

      expect(await screen.findByText(mensagem)).toBeInTheDocument()
      expect(
        screen.getByText('Minha pergunta continua aqui'),
      ).toBeInTheDocument()
      expect(screen.getByRole('alert')).toBeInTheDocument()

      falhar = false
      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
      expect(
        await screen.findByText(
          'Consulte a política interna para ver os detalhes.',
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Minha pergunta continua aqui'),
      ).toBeInTheDocument()
    },
  )

  it('usa Shift+Enter para inserir uma quebra de linha sem enviar', async () => {
    const user = userEvent.setup()
    renderizarComProvedores({ rota: ROTA_ASSISTENTE, usuario: criarUsuario() })
    const campo = await screen.findByRole('textbox', {
      name: 'Escreva sua pergunta',
    })

    await user.type(campo, 'Primeira linha')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    await user.type(campo, 'Segunda linha')

    expect(campo).toHaveValue('Primeira linha\nSegunda linha')
    expect(screen.queryByText('Primeira linha')).not.toBeInTheDocument()
  })

  it('não envia pergunta vazia', async () => {
    const user = userEvent.setup()
    renderizarComProvedores({ rota: ROTA_ASSISTENTE, usuario: criarUsuario() })
    await screen.findByRole('heading', { name: 'Assistente de IA' })

    const botaoEnviar = screen.getByRole('button', { name: 'Enviar' })
    expect(botaoEnviar).toBeDisabled()
    await user.click(botaoEnviar)
    expect(screen.queryByText(/Resposta de teste para/)).not.toBeInTheDocument()
  })
})
