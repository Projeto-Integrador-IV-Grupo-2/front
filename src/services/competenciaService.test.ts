import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  CompetenciaServiceError,
  criarCompetencia,
  listarCompetencias,
} from './competenciaService.ts'
import { criarCompetencia as fabricar, criarPagina } from '../test/factories.ts'
import { server } from '../test/msw/server.ts'

describe('competenciaService', () => {
  it('lista as competências ativas ordenadas por nome', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/api/competencias', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(criarPagina([fabricar()]))
      }),
    )

    const competencias = await listarCompetencias()

    expect(competencias.map((c) => c.nome)).toEqual(['Comunicação'])
    expect(url!.searchParams.get('sort')).toBe('nome')
    expect(url!.searchParams.has('incluirInativas')).toBe(false)
  })

  it('nome repetido traz a mensagem da API', async () => {
    server.use(
      http.post('*/api/competencias', () =>
        HttpResponse.json(
          { message: 'Já existe uma competência com o nome: Comunicação' },
          { status: 409 },
        ),
      ),
    )

    const promessa = criarCompetencia({
      nome: 'Comunicação',
      tipo: 'COMPORTAMENTAL',
      descricao: null,
    })

    await expect(promessa).rejects.toBeInstanceOf(CompetenciaServiceError)
    await expect(promessa).rejects.toThrow(
      'Já existe uma competência com o nome: Comunicação',
    )
  })

  it('erro de servidor ganha texto amigável', async () => {
    server.use(
      http.get('*/api/competencias', () =>
        HttpResponse.json({ message: 'NullPointerException' }, { status: 500 }),
      ),
    )

    await expect(listarCompetencias()).rejects.toThrow(
      'O servidor não conseguiu concluir a operação. Tente novamente em instantes.',
    )
  })
})
