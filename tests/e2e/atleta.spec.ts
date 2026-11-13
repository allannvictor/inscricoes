import { expect, test, type Browser, type Page } from '@playwright/test';

function cpfAleatorio(): string {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv = (base: number[], peso: number) => {
    const r = (base.reduce((s, d, i) => s + d * (peso - i), 0) * 10) % 11;
    return r === 10 ? 0 : r;
  };
  n.push(dv(n, 10));
  n.push(dv(n, 11));
  return n.join('');
}

async function entrar(page: Page, email: string, destino = '/entrar') {
  await page.goto(destino);
  await page.getByLabel('E-mail').fill(email);
  await page.getByRole('button', { name: 'Receber código' }).click();
  await page.getByLabel('Código').fill('123456');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/entrar'));
}

async function novaPagina(browser: Browser, email: string, destino?: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await entrar(page, email, destino);
  return { ctx, page };
}

test('área do atleta: minhas inscrições, comprovante, transferência e meus dados', async ({ page, browser }) => {
  const t = Date.now();
  const emailA = `ana+${t}@exemplo.com`;
  const emailB = `bruno+${t}@exemplo.com`;
  const emailC = `carla+${t}@exemplo.com`;
  const [cpfA, cpfB, cpfC] = [cpfAleatorio(), cpfAleatorio(), cpfAleatorio()];

  // Ana inscreve a si mesma e o Bruno (com o e-mail dele) e paga (simulado).
  await entrar(page, emailA, '/entrar?voltar=/eventos/simulado-10k-dezembro/inscricao');
  const p1 = page.getByRole('region', { name: 'Seus dados' });
  await p1.getByRole('button', { name: /5 km/ }).click();
  await p1.getByLabel('CPF').fill(cpfA);
  await p1.getByLabel('Nome completo').fill('Ana Atleta');
  await p1.getByLabel('Nascimento').fill('1992-02-02');
  await p1.getByLabel('Sexo').selectOption('F');
  await p1.getByLabel('WhatsApp').fill('11911112222');
  await p1.getByLabel('Camisa').selectOption('P');
  await p1.getByLabel('Contato de emergência').fill('Mãe 11933334444');
  await page.getByRole('button', { name: '+ Adicionar outro participante' }).click();
  const p2 = page.getByRole('region', { name: 'Participante 2' });
  await p2.getByRole('button', { name: /10 km/ }).click();
  await p2.getByLabel('CPF').fill(cpfB);
  await p2.getByLabel('Nome completo').fill('Bruno Atleta');
  await p2.getByLabel(/E-mail do participante/).fill(emailB);
  await p2.getByLabel('Nascimento').fill('1990-03-03');
  await p2.getByLabel('Sexo').selectOption('M');
  await p2.getByLabel('WhatsApp').fill('11955556666');
  await p2.getByLabel('Camisa').selectOption('G');
  await p2.getByLabel('Contato de emergência').fill('Pai 11977778888');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Pagar/ }).click();
  await page.getByRole('button', { name: 'Modo teste: simular Pix recebido' }).click();
  await page.getByRole('link', { name: 'Ver minhas inscrições' }).click();

  // Minhas inscrições da Ana: as duas do pedido.
  await expect(page.getByRole('heading', { name: 'Minhas inscrições' })).toBeVisible();
  await expect(page.getByText('Ana Atleta')).toBeVisible();
  await expect(page.getByText('Bruno Atleta')).toBeVisible();

  // Comprovante da Ana
  const cartaoAna = page.locator('section', { hasText: 'Ana Atleta' });
  await cartaoAna.getByRole('link', { name: 'Comprovante' }).click();
  await expect(page.getByText('Inscrição confirmada')).toBeVisible();
  await expect(page.getByText(/\*\*\*\.\d{3}\.\d{3}-\*\*/)).toBeVisible(); // CPF mascarado
  await page.goBack();

  // Bruno vê a dele (pelo e-mail).
  const bruno = await novaPagina(browser, emailB, '/entrar?voltar=/minhas-inscricoes');
  await expect(bruno.page.getByText('Bruno Atleta')).toBeVisible();
  await expect(bruno.page.getByText('Ana Atleta')).toHaveCount(0);

  // Ana transfere a inscrição do Bruno para a Carla.
  const cartaoBruno = page.locator('section', { hasText: 'Bruno Atleta' });
  const linkTransferir = await cartaoBruno.getByRole('link', { name: 'Transferir' }).getAttribute('href');
  const inscricaoId = linkTransferir!.split('/')[2];
  await page.goto(linkTransferir!);
  const form = page.getByRole('form', { name: 'Novo participante' });
  await form.getByLabel('CPF').fill(cpfA); // CPF já inscrito → bloqueia
  await form.getByLabel('Nome completo').fill('Carla Atleta');
  await form.getByLabel('E-mail').fill(emailC);
  await form.getByLabel('Nascimento').fill('1960-04-04');
  await form.getByLabel('Sexo').selectOption('F');
  await form.getByLabel('WhatsApp').fill('11922223333');
  await form.getByLabel('Camisa').selectOption('M');
  await form.getByLabel('Contato de emergência').fill('Filho 11944445555');
  await form.getByRole('button', { name: 'Transferir inscrição' }).click();
  await form.getByRole('button', { name: 'Confirmar transferência' }).click();
  await expect(page.getByText(/já tem inscrição neste evento/)).toBeVisible();
  await form.getByLabel('CPF').fill(cpfC);
  await form.getByRole('button', { name: 'Transferir inscrição' }).click();
  await form.getByRole('button', { name: 'Confirmar transferência' }).click();
  await expect(page.getByRole('heading', { name: 'Inscrição transferida' })).toBeVisible();

  // Carla agora vê a inscrição (categoria recalculada: 60+).
  const carla = await novaPagina(browser, emailC, '/entrar?voltar=/minhas-inscricoes');
  await expect(carla.page.getByText('Carla Atleta')).toBeVisible();
  await carla.page.getByRole('link', { name: 'Comprovante' }).click();
  await expect(carla.page.getByText('Feminino 60+')).toBeVisible();

  // Bruno não vê mais a inscrição nem consegue abrir o comprovante.
  await bruno.page.goto('/minhas-inscricoes');
  await expect(bruno.page.getByText(/Você ainda não tem inscrições/)).toBeVisible();
  await bruno.page.goto(`/inscricoes/${inscricaoId}`);
  await expect(bruno.page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();

  // Meus dados da Carla
  await carla.page.goto('/minha-conta');
  await carla.page.getByLabel('Nome completo').fill('Carla Atleta');
  await carla.page.getByLabel('CPF').fill(cpfC);
  await carla.page.getByRole('button', { name: 'Salvar meus dados' }).click();
  await expect(carla.page.getByText(/Dados salvos/)).toBeVisible();
  await carla.page.getByLabel('CPF').fill('123.456.789-00');
  await carla.page.getByRole('button', { name: 'Salvar meus dados' }).click();
  await expect(carla.page.getByText('CPF inválido.')).toBeVisible();

  await Promise.all([bruno.ctx.close(), carla.ctx.close()]);
});
