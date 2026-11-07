import { expect, test, type Page } from '@playwright/test';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });
config();

/** CPF aleatório válido (para o teste poder rodar várias vezes sem "CPF já inscrito"). */
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

async function entrar(page: Page, email: string) {
  await page.getByLabel('E-mail').fill(email);
  await page.getByRole('button', { name: 'Receber código' }).click();
  await page.getByLabel('Código').fill('123456');
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test('inscrição com 3 participantes (sócio, 60+ e cupom), Pix simulado e privacidade do pedido', async ({ page, browser }) => {
  const cpfSocio = cpfAleatorio();
  const cpfIdoso = cpfAleatorio();
  const cpfCheio = cpfAleatorio();
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  await sql`insert into socios (clube_id, cpf, nome) select id, ${cpfSocio}, 'Sócio E2E' from clubes where slug = 'cf-assessoria'`;
  await sql.end();

  await page.goto('/eventos/simulado-10k-dezembro');
  await expect(page.getByRole('heading', { name: 'Simulado 10K' })).toBeVisible();
  await page.getByRole('link', { name: 'Inscrever-se' }).click();

  await entrar(page, `e2e+${Date.now()}@exemplo.com`);

  // Participante 1: sócio, 10 km
  const p1 = page.getByRole('region', { name: 'Seus dados' });
  await p1.getByRole('button', { name: /10 km/ }).click();
  await p1.getByLabel('CPF').fill(cpfSocio);
  await expect(p1.getByText('Sócio do clube · preço de sócio')).toBeVisible();
  await p1.getByLabel('Nome completo').fill('Marina Teste');
  await p1.getByLabel('Nascimento').fill('1988-04-12');
  await p1.getByLabel('Sexo').selectOption('F');
  await p1.getByLabel('WhatsApp').fill('11988881234');
  await p1.getByLabel('Camisa').selectOption('M');
  await p1.getByLabel('Contato de emergência').fill('Paulo 11977770000');

  // Participante 2: 60+, 5 km
  await page.getByRole('button', { name: '+ Adicionar outro participante' }).click();
  const p2 = page.getByRole('region', { name: 'Participante 2' });
  await p2.getByRole('button', { name: /5 km/ }).click();
  await p2.getByLabel('CPF').fill(cpfIdoso);
  await p2.getByLabel('Nome completo').fill('Seu José Teste');
  await p2.getByLabel('Nascimento').fill('1958-03-02');
  await p2.getByLabel('Sexo').selectOption('M');
  await expect(p2.getByText('60+ · paga meia')).toBeVisible();
  await p2.getByLabel('WhatsApp').fill('11988885678');
  await p2.getByLabel('Camisa').selectOption('G');
  await p2.getByLabel('Contato de emergência').fill('Maria 11977771111');

  // Participante 3: preço cheio, 21 km, com cupom de 10%
  await page.getByRole('button', { name: '+ Adicionar outro participante' }).click();
  const p3 = page.getByRole('region', { name: 'Participante 3' });
  await p3.getByRole('button', { name: /21 km/ }).click();
  await p3.getByLabel('CPF').fill(cpfCheio);
  await p3.getByLabel('Nome completo').fill('Pedro Teste');
  await p3.getByLabel('Nascimento').fill('1995-07-20');
  await p3.getByLabel('Sexo').selectOption('M');
  await p3.getByLabel('WhatsApp').fill('11988889999');
  await p3.getByLabel('Camisa').selectOption('P');
  await p3.getByLabel('Contato de emergência').fill('Ana 11977772222');

  await page.getByLabel('Cupom').fill('amigo10');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.getByText('Cupom AMIGO10 aplicado.')).toBeVisible();
  await page.getByRole('checkbox').check();

  // 45 (sócio) + 25 (meia) + 80 - 8 (cupom) = 142
  await page.getByRole('button', { name: 'Pagar R$ 142,00 com Pix' }).click();
  await expect(page.getByRole('heading', { name: 'Pagamento' })).toBeVisible();
  await expect(page.getByAltText('QR code do Pix')).toBeVisible();
  const urlPedido = page.url();

  await page.getByRole('button', { name: 'Modo teste: simular Pix recebido' }).click();
  await expect(page.getByRole('heading', { name: 'Inscrição confirmada' })).toBeVisible();
  await expect(page.getByText('Seu José Teste')).toBeVisible();

  // Outra pessoa logada não consegue ver o pedido.
  const outro = await browser.newContext();
  const pagina2 = await outro.newPage();
  await pagina2.goto('/entrar');
  await entrar(pagina2, `intruso+${Date.now()}@exemplo.com`);
  await pagina2.waitForURL((u) => !u.pathname.startsWith('/entrar'));
  await pagina2.goto(urlPedido);
  await expect(pagina2.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  await outro.close();

  // O mesmo CPF não se inscreve duas vezes no evento.
  await page.goto('/eventos/simulado-10k-dezembro/inscricao');
  const r1 = page.getByRole('region', { name: 'Seus dados' });
  await r1.getByRole('button', { name: /10 km/ }).click();
  await r1.getByLabel('CPF').fill(cpfCheio);
  await r1.getByLabel('Camisa').selectOption('M');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Pagar/ }).click();
  await expect(page.getByText(/Já existe inscrição neste evento/)).toBeVisible();
});
