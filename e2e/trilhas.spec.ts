import { expect, test, type Page } from '@playwright/test'
import { ADMIN, apiComo, criarTrilha } from './support/api.ts'
import { SESSAO, unico } from './support/dados.ts'

function filtros(page: Page) {
  return page.getByRole('search', { name: 'Filtros de trilhas' })
}

async function buscarNoCatalogo(page: Page, nome: string) {
  await page.goto('/trilhas?aba=catalogo')
  await filtros(page).getByLabel('Buscar').fill(nome)
}

test.describe('Trilhas — administrador', () => {
  test.use({ storageState: SESSAO.admin })

  test('cria uma trilha e ela aparece no catálogo', async ({ page }) => {
    const nome = unico('Trilha')

    await page.goto('/trilhas?aba=catalogo')
    await page.getByRole('button', { name: 'Nova trilha' }).click()

    const dialogo = page.getByRole('dialog', { name: 'Nova trilha' })
    await dialogo.getByLabel('Nome da trilha').fill(nome)
    await dialogo.getByLabel('Prazo (dias)').fill('30')
    await dialogo.getByLabel('Objetivo').fill('Validar o cadastro pelo E2E.')
    await dialogo.getByRole('button', { name: 'Criar trilha' }).click()

    await expect(page.getByText(`Trilha “${nome}” criada.`)).toBeVisible()
    await expect(dialogo).toBeHidden()

    await filtros(page).getByLabel('Buscar').fill(nome)
    await expect(page.getByRole('link', { name: new RegExp(nome) })).toBeVisible()
  })

  test('nome obrigatório: o formulário não envia vazio', async ({ page }) => {
    await page.goto('/trilhas?aba=catalogo')
    await page.getByRole('button', { name: 'Nova trilha' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Nova trilha' })

    await dialogo.getByRole('button', { name: 'Criar trilha' }).click()

    await expect(dialogo.getByText('Informe o nome da trilha.')).toBeVisible()
    await expect(dialogo).toBeVisible()
  })
})

test.describe('Trilhas — colaborador', () => {
  test.use({ storageState: SESSAO.colaborador })

  let trilha: { id: string; nome: string }

  test.beforeAll(async () => {
    const api = await apiComo(ADMIN)
    trilha = await criarTrilha(api, { nome: unico('Trilha'), prazoDias: 15 })
    await api.dispose()
  })

  test('não vê o botão de criar trilha', async ({ page }) => {
    await page.goto('/trilhas?aba=catalogo')
    await expect(page.getByRole('heading', { name: 'Trilhas' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nova trilha' })).toHaveCount(
      0,
    )
  })

  test('encontra a trilha no catálogo, inicia e conclui', async ({ page }) => {
    await buscarNoCatalogo(page, trilha.nome)
    await page.getByRole('link', { name: new RegExp(trilha.nome) }).click()

    await expect(
      page.getByRole('heading', { name: trilha.nome, level: 1 }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Iniciar trilha' }).click()
    await expect(page.getByText('Trilha iniciada.')).toBeVisible()

    await page.getByRole('button', { name: 'Marcar como concluída' }).click()
    await expect(page.getByText('Trilha concluída. Parabéns!')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Retomar trilha' }),
    ).toBeVisible()
  })

  test('a trilha iniciada aparece em "Minhas trilhas"', async ({ page }) => {
    await page.goto('/trilhas')
    await expect(
      page.getByRole('tab', { name: 'Minhas trilhas' }),
    ).toHaveAttribute('aria-selected', 'true')

    await filtros(page).getByLabel('Buscar').fill(trilha.nome)
    await expect(
      page.getByRole('link', { name: new RegExp(trilha.nome) }),
    ).toBeVisible()
  })

  test('trocar de aba muda a URL e a busca sem resultado mostra o estado vazio', async ({
    page,
  }) => {
    await page.goto('/trilhas')
    await page.getByRole('tab', { name: 'Catálogo' }).click()
    await expect(page).toHaveURL(/aba=catalogo/)

    await filtros(page).getByLabel('Buscar').fill(unico('inexistente'))
    await expect(page.getByText('Nenhuma trilha encontrada')).toBeVisible()

    await filtros(page).getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(page.getByText('Nenhuma trilha encontrada')).toHaveCount(0)
  })

  test('trilha inexistente mostra a mensagem de não encontrada', async ({
    page,
  }) => {
    await page.goto('/trilhas/00000000-0000-4000-8000-000000000000')
    await expect(page.getByText(/Trilha não encontrada/).first()).toBeVisible()
  })
})
