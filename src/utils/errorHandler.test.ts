import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  ehErroDoServidor,
  HTTP_STATUS,
  MENSAGENS_DE_ERRO,
  normalizarErro,
} from './errorHandler.ts'

const PADRAO = 'Não foi possível concluir.'

function erroDaApi(status: number, data?: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() }
  const response = {
    status,
    data,
    statusText: String(status),
    headers: {},
    config,
  } as AxiosResponse
  return new AxiosError('falhou', undefined, config, undefined, response)
}

describe('errorHandler', () => {
  it('usa a mensagem da API quando o status não tem texto próprio', () => {
    const erro = normalizarErro(
      erroDaApi(HTTP_STATUS.CONFLICT, {
        message: 'Nome já utilizado.',
        fieldErrors: [{ field: 'nome', message: 'duplicado' }],
      }),
      PADRAO,
    )

    expect(erro).toEqual({
      message: 'Nome já utilizado.',
      status: HTTP_STATUS.CONFLICT,
      fieldErrors: [{ field: 'nome', message: 'duplicado' }],
    })
  })

  it('usa o texto padrão do 403, que costuma vir sem corpo', () => {
    const erro = normalizarErro(erroDaApi(HTTP_STATUS.FORBIDDEN), PADRAO)

    expect(erro.message).toBe(MENSAGENS_DE_ERRO.SEM_PERMISSAO)
    expect(erro.status).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('mostra a mensagem da API num 5xx quando o service não pede outra', () => {
    const erro = normalizarErro(
      erroDaApi(503, { message: 'Serviço indisponível no momento.' }),
      PADRAO,
    )

    expect(erro.message).toBe('Serviço indisponível no momento.')
  })

  it('esconde a mensagem técnica de qualquer 5xx quando o service pede', () => {
    const erro = normalizarErro(
      erroDaApi(503, { message: 'Connection pool exhausted' }),
      PADRAO,
      {
        mensagens: {
          [HTTP_STATUS.INTERNAL_SERVER_ERROR]:
            MENSAGENS_DE_ERRO.ERRO_DO_SERVIDOR,
        },
      },
    )

    expect(erro.message).toBe(MENSAGENS_DE_ERRO.ERRO_DO_SERVIDOR)
  })

  it('prefere a mensagem da API à padrão do 403', () => {
    const erro = normalizarErro(
      erroDaApi(HTTP_STATUS.FORBIDDEN, { message: 'Sem permissão' }),
      PADRAO,
    )

    expect(erro.message).toBe('Sem permissão')
  })

  it('deixa o service trocar o texto de um status', () => {
    const erro = normalizarErro(
      erroDaApi(HTTP_STATUS.NOT_FOUND, {
        message: 'Usuário não encontrado: 1',
      }),
      PADRAO,
      { mensagens: { [HTTP_STATUS.NOT_FOUND]: 'Colaborador não encontrado.' } },
    )

    expect(erro.message).toBe('Colaborador não encontrado.')
  })

  it('lê o corpo informado quando a resposta não veio como JSON', () => {
    const erro = normalizarErro(
      erroDaApi(HTTP_STATUS.BAD_REQUEST, new Blob(['{}'])),
      PADRAO,
      { corpo: { message: 'Formato não suportado.' } },
    )

    expect(erro.message).toBe('Formato não suportado.')
  })

  it('cai no texto da operação sem resposta ou fora do Axios', () => {
    expect(normalizarErro(new Error('rede'), PADRAO)).toEqual({
      message: PADRAO,
      fieldErrors: [],
    })
    expect(normalizarErro(erroDaApi(418), PADRAO).message).toBe(PADRAO)
  })

  it('reconhece erros do servidor', () => {
    expect(ehErroDoServidor(HTTP_STATUS.INTERNAL_SERVER_ERROR)).toBe(true)
    expect(ehErroDoServidor(HTTP_STATUS.NOT_FOUND)).toBe(false)
    expect(ehErroDoServidor(undefined)).toBe(false)
  })
})
