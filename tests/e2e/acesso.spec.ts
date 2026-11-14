import { expect, test, type Page } from '@playwright/test';

async function entrarComCodigo(page: Page, email: string, destino = '/entrar') {
  await page.goto(destino);
  await page.getByLabel('E-mail').fill(email);
  await page.getByRole('button', { name: 'Receber código' }).click();
  await page.getByLabel('Código').fill('123456');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/entrar'));
}

test('depois do login, nunca redireciona para outro site', async ({ page }) => {
  const email = `redir+${Date.now()}@exemplo.com`;
  await page.goto('/entrar?voltar=' + encodeURIComponent('/\\site-falso.com'));
  await page.getByLabel('E-mail').fill(email);
  await page.getByRole('button', { name: 'Receber código' }).click();
  await page.getByLabel('Código').fill('123456');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/entrar'));
  expect(new URL(page.url()).host).toBe('localhost:3100');
  expect(new URL(page.url()).pathname).toBe('/');
});

test('senha opcional: criar em Meus dados, entrar com senha, errar e remover', async ({ page, browser }) => {
  const email = `senha+${Date.now()}@exemplo.com`;
  const senha = 'corrida de domingo';

  // Outra sessão aberta (outro aparelho), que deve cair quando a senha for criada.
  const outroAparelho = await browser.newContext();
  const outra = await outroAparelho.newPage();
  await entrarComCodigo(outra, email, '/entrar?voltar=/minha-conta');

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

  // A sessão do outro aparelho foi encerrada.
  await outra.goto('/minha-conta');
  await expect(outra).toHaveURL(/\/entrar/);
  await outroAparelho.close();

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

  // Trocar a senha pede a senha atual: errada não troca.
  const novaSenha = 'longao na orla de atalaia';
  await page.getByRole('link', { name: 'Minha conta' }).click();
  const acesso2 = page.getByRole('region', { name: 'Acesso' });
  await acesso2.getByRole('button', { name: 'Trocar senha' }).click();
  await acesso2.getByLabel('Senha atual').fill('nao e esta');
  await acesso2.getByLabel('Nova senha').fill(novaSenha);
  await acesso2.getByLabel('Repita a senha').fill(novaSenha);
  await acesso2.getByRole('button', { name: 'Salvar senha' }).click();
  await expect(acesso2.getByText('A senha atual está incorreta.')).toBeVisible();

  // "Esqueci a senha atual": confirma com o código enviado ao e-mail (fixo nos testes) e troca.
  await acesso2.getByRole('button', { name: 'Esqueci a senha atual' }).click();
  await acesso2.getByLabel('Código enviado ao seu e-mail').fill('123456');
  await acesso2.getByRole('button', { name: 'Salvar senha' }).click();
  await expect(acesso2.getByText(/Senha salva/)).toBeVisible();

  // Remover também pede a senha atual (a nova): entrar com senha deixa de funcionar.
  await acesso2.getByRole('button', { name: 'Remover senha' }).click();
  await acesso2.getByLabel('Senha atual').fill(senha); // a antiga, que já não vale
  await acesso2.getByRole('button', { name: 'Confirmar remoção' }).click();
  await expect(acesso2.getByText('A senha atual está incorreta.')).toBeVisible();
  await acesso2.getByLabel('Senha atual').fill(novaSenha);
  await acesso2.getByRole('button', { name: 'Confirmar remoção' }).click();
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
