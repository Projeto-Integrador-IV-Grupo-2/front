import { expect, test, type Page } from '@playwright/test'
import { ADMIN, apiComo, criarArea } from './support/api.ts'
import { SESSAO, unico } from './support/dados.ts'

async function buscar(page: Page, nome: string) {
  await page.getByPlaceholder('Buscar por nome...').fill(nome)
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
}

function linhaDa(page: Page, nome: string) {
  return page.getByRole('row').filter({ hasText: nome })
}

test.describe('Áreas — gestão pelo administrador', () => {
  test.use({ storageState: SESSAO.admin })

  test('cadastra, edita, inativa e reativa uma área', async ({ page }) => {
    const nome = unico('Área')
    const novoNome = `${nome} editada`

    await page.goto('/areas')
    await page.getByRole('button', { name: 'Nova área' }).click()

    const cadastro = page.getByRole('dialog', { name: 'Nova área' })
    await cadastro.getByLabel('Nome da área').fill(nome)
    await cadastro.getByLabel('Descrição').fill('Criada pelo teste E2E')
    await cadastro.getByRole('button', { name: 'Cadastrar área' }).click()

    await expect(page.getByText('Área cadastrada.')).toBeVisible()
    await expect(cadastro).toBeHidden()

    await buscar(page, nome)
    await expect(linhaDa(page, nome)).toContainText('Ativa')

    await page.getByRole('button', { name: `Editar ${nome}` }).click()
    const edicao = page.getByRole('dialog', { name: 'Editar área' })
    await expect(edicao.getByLabel('Nome da área')).toHaveValue(nome)
    await edicao.getByLabel('Nome da área').fill(novoNome)
    await edicao.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(page.getByText('Área atualizada.')).toBeVisible()
    await expect(linhaDa(page, novoNome)).toBeVisible()

    await page.getByRole('button', { name: `Inativar ${novoNome}` }).click()
    await expect(page.getByText('Área inativada.')).toBeVisible()
    await expect(linhaDa(page, novoNome)).toContainText('Inativa')

    await page.getByRole('button', { name: `Reativar ${novoNome}` }).click()
    await expect(page.getByText('Área reativada.')).toBeVisible()
    await expect(linhaDa(page, novoNome)).toContainText('Ativa')
  })

  test('nome em branco e nome repetido mostram o erro no formulário', async ({
    page,
  }) => {
    const existente = unico('Área')
    const api = await apiComo(ADMIN)
    await criarArea(api, existente)
    await api.dispose()

    await page.goto('/areas')
    await page.getByRole('button', { name: 'Nova área' }).click()
    const cadastro = page.getByRole('dialog', { name: 'Nova área' })

    await cadastro.getByRole('button', { name: 'Cadastrar área' }).click()
    await expect(cadastro.getByRole('alert').first()).toBeVisible()

    await cadastro.getByLabel('Nome da área').fill(existente)
    await cadastro.getByRole('button', { name: 'Cadastrar área' }).click()
    await expect(cadastro.getByRole('alert').first()).toContainText(
      'Já existe uma área',
    )
    // O formulário continua aberto para a pessoa corrigir.
    await expect(cadastro).toBeVisible()
  })

  test('busca sem resultado mostra o estado vazio', async ({ page }) => {
    await page.goto('/areas')
    await buscar(page, unico('inexistente'))
    await expect(page.getByText(/Nenhuma área encontrada/)).toBeVisible()
  })
})

test.describe('Áreas — colaborador só consulta', () => {
  test.use({ storageState: SESSAO.colaborador })

  test('vê a listagem, mas não os botões de gestão', async ({ page }) => {
    const nome = unico('Área')
    const api = await apiComo(ADMIN)
    await criarArea(api, nome)
    await api.dispose()

    await page.goto('/areas')
    await expect(page.getByRole('heading', { name: 'Áreas' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nova área' })).toHaveCount(0)

    await buscar(page, nome)
    await expect(linhaDa(page, nome)).toBeVisible()
    await expect(
      page.getByRole('button', { name: `Editar ${nome}` }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: `Inativar ${nome}` }),
    ).toHaveCount(0)
  })
})
