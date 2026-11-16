import { expect, test, type Page } from '@playwright/test'
import {
  ADMIN,
  COLABORADOR,
  apiComo,
  criarTrilha,
  iniciarTrilha,
} from './support/api.ts'
import { SESSAO, unico } from './support/dados.ts'

function filtros(page: Page) {
  return page.getByRole('search', { name: 'Filtros do acompanhamento' })
}

test.describe('Acompanhamento — gestor', () => {
  test.use({ storageState: SESSAO.gestor })

  let trilha: { id: string; nome: string }

  // Cenário: uma trilha nova que o colaborador de teste já iniciou.
  test.beforeAll(async () => {
    const comoAdmin = await apiComo(ADMIN)
    trilha = await criarTrilha(comoAdmin, {
      nome: unico('Trilha'),
      prazoDias: 20,
    })
    await comoAdmin.dispose()

    const comoColaborador = await apiComo(COLABORADOR)
    await iniciarTrilha(comoColaborador, trilha.id)
    await comoColaborador.dispose()
  })

  test('filtra por trilha e vê o andamento do colaborador', async ({
    page,
  }) => {
    await page.goto('/acompanhamento')
    await expect(
      page.getByRole('heading', { name: 'Acompanhamento' }),
    ).toBeVisible()

    await filtros(page).getByLabel('Trilha').selectOption({ label: trilha.nome })

    const linha = page.getByRole('row').filter({ hasText: trilha.nome })
    await expect(linha).toHaveCount(1)
    await expect(linha).toContainText(COLABORADOR.nomeCompleto)
    await expect(linha).toContainText('Em andamento')
  })

  test('abre o painel do colaborador com os totais e as trilhas dele', async ({
    page,
  }) => {
    await page.goto('/acompanhamento')
    await filtros(page).getByLabel('Trilha').selectOption({ label: trilha.nome })

    await page
      .getByRole('button', {
        name: `Ver trilhas de ${COLABORADOR.nomeCompleto}`,
      })
      .click()

    const painel = page.getByRole('dialog')
    await expect(painel).toContainText(COLABORADOR.nomeCompleto)
    await expect(painel).toContainText('Em andamento')
    await expect(
      painel.getByRole('list', {
        name: `Trilhas de ${COLABORADOR.nomeCompleto}`,
      }),
    ).toContainText(trilha.nome)

    await painel.getByRole('button', { name: 'Fechar' }).click()
    await expect(painel).toBeHidden()
  })

  test('exporta o CSV respeitando o filtro', async ({ page }) => {
    await page.goto('/acompanhamento')
    await filtros(page).getByLabel('Trilha').selectOption({ label: trilha.nome })
    await expect(
      page.getByRole('row').filter({ hasText: trilha.nome }),
    ).toHaveCount(1)

    const esperaDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar CSV' }).click()
    const download = await esperaDownload

    expect(download.suggestedFilename()).toMatch(/\.csv$/)
    await expect(
      page.getByText('Exportação concluída. O download do CSV começou.'),
    ).toBeVisible()

    const fluxo = await download.createReadStream()
    const partes: Buffer[] = []
    for await (const parte of fluxo) {
      partes.push(parte as Buffer)
    }
    const csv = Buffer.concat(partes).toString('utf8')
    // BOM no início: é o que faz o Excel abrir os acentos certos.
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const linhas = csv.trim().split('\r\n')
    expect(linhas).toHaveLength(2)
    expect(linhas[1]).toContain(trilha.nome)
    expect(linhas[1]).toContain(COLABORADOR.nomeCompleto)
  })

  test('filtro sem resultado mostra o estado vazio', async ({ page }) => {
    await page.goto('/acompanhamento')
    await filtros(page).getByLabel('Trilha').selectOption({ label: trilha.nome })
    await filtros(page).getByLabel('Status').selectOption({ label: 'Concluída' })

    await expect(
      page.getByText('Nenhuma trilha encontrada com os filtros atuais.'),
    ).toBeVisible()

    await filtros(page).getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(
      page.getByText('Nenhuma trilha encontrada com os filtros atuais.'),
    ).toHaveCount(0)
  })
})
