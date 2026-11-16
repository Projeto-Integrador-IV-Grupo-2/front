import { expect, test } from '@playwright/test'
import { ADMIN } from './support/api.ts'
import { SEM_SESSAO, SESSAO } from './support/dados.ts'

test.describe('Login', () => {
  test.use({ storageState: SEM_SESSAO })

  test('entra com credenciais válidas e chega ao Dashboard', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(ADMIN.email)
    await page.getByLabel('Senha').fill(ADMIN.senha)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(
      page.getByRole('button', { name: 'Sair da conta' }),
    ).toBeVisible()
  })

  test('senha errada mostra o erro e continua na tela de login', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(ADMIN.email)
    await page.getByLabel('Senha').fill('senha-errada')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()

    await expect(page.getByRole('alert')).toHaveText(
      'E-mail ou senha inválidos.',
    )
    await expect(page).toHaveURL(/\/login$/)
  })

  test('campos vazios e e-mail inválido são barrados antes de chamar a API', async ({
    page,
  }) => {
    let chamouLogin = false
    page.on('request', (requisicao) => {
      if (requisicao.url().includes('/api/auth/login')) {
        chamouLogin = true
      }
    })

    await page.goto('/login')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByText('Informe o e-mail.')).toBeVisible()
    await expect(page.getByText('Informe a senha.')).toBeVisible()

    await page.getByLabel('E-mail').fill('nao-e-email')
    await page.getByLabel('Senha').fill('qualquer')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()

    expect(chamouLogin).toBe(false)
  })

  test('rota protegida sem sessão leva para o login', async ({ page }) => {
    await page.goto('/trilhas')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  })
})

test.describe('Sessão', () => {
  test.use({ storageState: SESSAO.admin })

  test('continua logado depois de recarregar a página', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(
      page.getByRole('button', { name: 'Sair da conta' }),
    ).toBeVisible()

    await page.reload()

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(
      page.getByRole('button', { name: 'Sair da conta' }),
    ).toBeVisible()
  })

  test('sair encerra a sessão e bloqueia as rotas protegidas', async ({
    page,
  }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Sair da conta' }).click()
    await expect(page).toHaveURL(/\/login$/)

    await page.goto('/areas')
    await expect(page).toHaveURL(/\/login$/)
  })
})
