import { expect, test, type Page } from '@playwright/test';

async function entrarComCodigo(page: Page, email: string, destino = '/entrar') {
  await page.goto(destino);
  await page.getByLabel('E-mail').fill(email);
  await page.getByRole('button', { name: 'Receber código' }).click();
  await page.getByLabel('Código').fill('123456');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/entrar'));
}

test('senha opcional: criar em Meus dados, entrar com senha, errar e remover', async ({ page }) => {
  const email = `senha+${Date.now()}@exemplo.com`;
  const senha = 'corrida de domingo';

  // Sem Google configurado, o botão não aparece.
  await page.goto('/entrar');
  await expect(page.getByRole('link', { name: 'Entrar com Google' })).toHaveCount(0);

  // Entra com código e cria a senha.
  await entrarComCodigo(page, email, '/entrar?voltar=/minha-conta');
  const acesso = page.getByRole('region', { name: 'Acesso' });
  await acesso.getByRole('button', { name: 'Criar senha' }).click();
  await acesso.getByLabel('Nova senha').fill('12345678');
  await acesso.getByLabel('Repita a senha').fill('12345678');
  await acesso.getByRole('button', { name: 'Salvar senha' }).click();
  await expect(acesso.getByText('Essa senha é muito comum. Escolha outra.')).toBeVisible();
  await acesso.getByLabel('Nova senha').fill(senha);
  await acesso.getByLabel('Repita a senha').fill(senha);
  await acesso.getByRole('button', { name: 'Salvar senha' }).click();
  await expect(acesso.getByText(/Senha salva/)).toBeVisible();

  // Sai e entra com senha (errada, depois certa).
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible(); // espera o "Sair" terminar
  await page.goto('/entrar?voltar=/minhas-inscricoes');
  await page.getByRole('button', { name: 'Entrar com senha' }).click();
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha errada demais');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText(/E-mail ou senha incorretos/)).toBeVisible();
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minhas inscrições' })).toBeVisible();

  // Remove a senha: entrar com senha deixa de funcionar.
  await page.goto('/minha-conta');
  await page.getByRole('region', { name: 'Acesso' }).getByRole('button', { name: 'Remover senha' }).click();
  await expect(page.getByText(/Senha removida/)).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible(); // espera o "Sair" terminar
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Entrar com senha' }).click();
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText(/E-mail ou senha incorretos/)).toBeVisible();
});
