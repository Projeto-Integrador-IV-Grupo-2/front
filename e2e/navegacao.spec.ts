import { expect, test, type Page } from '@playwright/test'
import { SESSAO } from './support/dados.ts'

function menu(page: Page) {
  return page.locator('#primary-navigation')
}

test.describe('Menu e permissões — administrador', () => {
  test.use({ storageState: SESSAO.admin })

  test('vê todos os itens do menu e navega por eles', async ({ page }) => {
    await page.goto('/dashboard')

    for (const item of [
      'Dashboard',
      'Trilhas',
      'Usuários',
      'Áreas',
      'Acompanhamento',
    ]) {
      await expect(menu(page).getByRole('link', { name: item })).toBeVisible()
    }

    await menu(page).getByRole('link', { name: 'Áreas' }).click()
    await expect(page).toHaveURL(/\/areas$/)
    await expect(page.getByRole('heading', { name: 'Áreas' })).toBeVisible()

    await menu(page).getByRole('link', { name: 'Usuários' }).click()
    await expect(page).toHaveURL(/\/usuarios$/)
    await expect(page.getByRole('heading', { name: 'Usuários' })).toBeVisible()

    await menu(page).getByRole('link', { name: 'Acompanhamento' }).click()
    await expect(page).toHaveURL(/\/acompanhamento$/)
    await expect(
      page.getByRole('heading', { name: 'Acompanhamento' }),
    ).toBeVisible()
  })
})

test.describe('Menu e permissões — gestor', () => {
  test.use({ storageState: SESSAO.gestor })

  test('vê o Acompanhamento, mas não a gestão de usuários', async ({
    page,
  }) => {
    await page.goto('/dashboard')
    await expect(
      menu(page).getByRole('link', { name: 'Acompanhamento' }),
    ).toBeVisible()
    await expect(
      menu(page).getByRole('link', { name: 'Usuários' }),
    ).toHaveCount(0)

    await page.goto('/usuarios')
    await expect(
      page.getByRole('heading', { name: 'Acesso negado' }),
    ).toBeVisible()
  })
})

test.describe('Menu e permissões — colaborador', () => {
  test.use({ storageState: SESSAO.colaborador })

  test('não vê Usuários nem Acompanhamento no menu', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(
      menu(page).getByRole('link', { name: 'Trilhas' }),
    ).toBeVisible()
    await expect(menu(page).getByRole('link', { name: 'Áreas' })).toBeVisible()
    await expect(
      menu(page).getByRole('link', { name: 'Usuários' }),
    ).toHaveCount(0)
    await expect(
      menu(page).getByRole('link', { name: 'Acompanhamento' }),
    ).toHaveCount(0)
  })

  test('recebe "Acesso negado" ao abrir uma rota restrita pelo endereço', async ({
    page,
  }) => {
    await page.goto('/usuarios')
    await expect(
      page.getByRole('heading', { name: 'Acesso negado' }),
    ).toBeVisible()
    // A URL pedida continua visível: a tela é trocada, não redirecionada.
    await expect(page).toHaveURL(/\/usuarios$/)

    await page.goto('/acompanhamento')
    await expect(
      page.getByRole('heading', { name: 'Acesso negado' }),
    ).toBeVisible()
  })

  test('endereço inexistente mostra "Página não encontrada"', async ({
    page,
  }) => {
    await page.goto('/isso-nao-existe')
    await expect(
      page.getByRole('heading', { name: 'Página não encontrada' }),
    ).toBeVisible()
  })
})
