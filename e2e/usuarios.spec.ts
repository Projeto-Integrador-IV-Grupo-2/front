import { expect, test, type Page } from '@playwright/test'
import { SEM_SESSAO, SESSAO, unico } from './support/dados.ts'

const SENHA = 'SenhaE2E123'

function filtros(page: Page) {
  return page.getByRole('form', { name: 'Filtros de usuários' })
}

async function filtrarPorEmail(page: Page, email: string) {
  await filtros(page).getByLabel('E-mail').fill(email)
  await filtros(page).getByRole('button', { name: 'Filtrar' }).click()
}

async function cadastrarUsuario(page: Page, nome: string, email: string) {
  await page.getByRole('button', { name: 'Novo usuário' }).click()
  const formulario = page.getByRole('region', { name: 'Novo usuário' })
  await formulario.getByLabel('Nome completo').fill(nome)
  await formulario.getByLabel('E-mail').fill(email)
  await formulario.getByLabel('Senha').fill(SENHA)
  await formulario.getByLabel('Data de entrada').fill('2026-01-10')
  await formulario.getByLabel('Perfil').selectOption({ label: 'Colaborador' })
  await formulario.getByRole('button', { name: 'Cadastrar' }).click()
  await expect(page.getByText('Usuário cadastrado.')).toBeVisible()
}

test.describe('Usuários — gestão pelo administrador', () => {
  test.use({ storageState: SESSAO.admin })

  test('cadastra um usuário, encontra pelo filtro e ele consegue entrar', async ({
    page,
    browser,
  }) => {
    const nome = unico('Pessoa')
    const email = `${nome.toLowerCase().replace(/\s+/g, '.')}@nexo.com`

    await page.goto('/usuarios')
    await cadastrarUsuario(page, nome, email)

    await filtrarPorEmail(page, email)
    const linha = page.getByRole('row').filter({ hasText: email })
    await expect(linha).toContainText(nome)
    await expect(linha).toContainText('Colaborador')

    // O usuário recém-criado entra com a senha definida no cadastro.
    const outraJanela = await browser.newContext({ storageState: SEM_SESSAO })
    const paginaDoUsuario = await outraJanela.newPage()
    await paginaDoUsuario.goto('/login')
    await paginaDoUsuario.getByLabel('E-mail').fill(email)
    await paginaDoUsuario.getByLabel('Senha').fill(SENHA)
    await paginaDoUsuario
      .getByRole('button', { name: 'Entrar', exact: true })
      .click()
    await expect(paginaDoUsuario).toHaveURL(/\/dashboard$/)
    await outraJanela.close()
  })

  test('desativa e reativa um usuário, com confirmação', async ({
    page,
    browser,
  }) => {
    const nome = unico('Pessoa')
    const email = `${nome.toLowerCase().replace(/\s+/g, '.')}@nexo.com`

    await page.goto('/usuarios')
    await cadastrarUsuario(page, nome, email)
    await filtrarPorEmail(page, email)

    await page.getByRole('button', { name: `Desativar ${nome}` }).click()
    const confirmacao = page.getByRole('alertdialog', {
      name: 'Desativar usuário',
    })
    await confirmacao.getByRole('button', { name: 'Desativar' }).click()
    await expect(page.getByText('Usuário desativado.')).toBeVisible()

    // Desativado não entra mais.
    const outraJanela = await browser.newContext({ storageState: SEM_SESSAO })
    const paginaDoUsuario = await outraJanela.newPage()
    await paginaDoUsuario.goto('/login')
    await paginaDoUsuario.getByLabel('E-mail').fill(email)
    await paginaDoUsuario.getByLabel('Senha').fill(SENHA)
    await paginaDoUsuario
      .getByRole('button', { name: 'Entrar', exact: true })
      .click()
    await expect(paginaDoUsuario.getByRole('alert')).toBeVisible()
    await expect(paginaDoUsuario).toHaveURL(/\/login$/)
    await outraJanela.close()

    await page.getByRole('button', { name: `Reativar ${nome}` }).click()
    await page
      .getByRole('alertdialog', { name: 'Reativar usuário' })
      .getByRole('button', { name: 'Reativar' })
      .click()
    await expect(page.getByText('Usuário reativado.')).toBeVisible()
  })

  test('senha fraca é recusada e o formulário continua aberto', async ({
    page,
  }) => {
    await page.goto('/usuarios')
    await page.getByRole('button', { name: 'Novo usuário' }).click()
    const formulario = page.getByRole('region', { name: 'Novo usuário' })
    await formulario.getByLabel('Nome completo').fill(unico('Pessoa'))
    await formulario
      .getByLabel('E-mail')
      .fill(`${Date.now()}.fraca@nexo.com`)
    await formulario.getByLabel('Senha').fill('fraca')
    await formulario.getByLabel('Data de entrada').fill('2026-01-10')
    await formulario.getByRole('button', { name: 'Cadastrar' }).click()

    await expect(formulario.getByText(/senha deve ter/i).first()).toBeVisible()
    await expect(page.getByText('Usuário cadastrado.')).toHaveCount(0)
  })
})
