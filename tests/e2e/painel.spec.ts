import { expect, test, type Page } from '@playwright/test';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });
config();

// Os e-mails fixos de teste entram muitas vezes; zera o limite de 5 códigos por hora antes de rodar.
test.beforeAll(async () => {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  await sql`delete from codigos_login where email in ('organizador@exemplo.com', 'master@exemplo.com')`;
  await sql.end();
});

/** CPF aleatório válido. */
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

// PNG 2x2 válido, para testar o envio da imagem do evento.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMAAAA0iAQSYi5MUAAAAAElFTkSuQmCC', 'base64');

test('atleta não acessa o painel', async ({ page }) => {
  await entrar(page, `atleta+${Date.now()}@exemplo.com`);
  await expect(page.getByRole('link', { name: 'Painel' })).toHaveCount(0);
  await page.goto('/painel');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  await page.goto('/painel/c/cf-assessoria');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  const csv = await page.request.get('/painel/c/cf-assessoria/eventos/00000000-0000-0000-0000-000000000000/planilha');
  expect(csv.status()).toBe(404);
});

test('master vê todos os clubes', async ({ page }) => {
  await entrar(page, 'master@exemplo.com', '/entrar?voltar=/painel');
  await expect(page.getByRole('heading', { name: 'Clubes', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /CF Assessoria Esportiva/ }).click();
  await expect(page.getByText('Painel · acesso master')).toBeVisible();
});

test('master cria um clube e o organizador convidado entra no painel dele', async ({ page, browser }) => {
  const t = Date.now();
  const nome = `Clube E2E ${t}`;
  const emailOrg = `org+${t}@exemplo.com`;
  await entrar(page, 'master@exemplo.com', '/entrar?voltar=/painel');
  await page.getByRole('link', { name: '+ Novo clube' }).click();
  await page.getByLabel('Nome do clube').fill(nome);
  await expect(page.getByLabel('Endereço no painel')).toHaveValue(`clube-e2e-${t}`);
  await page.getByLabel('E-mail do primeiro organizador').fill(emailOrg);
  await page.getByLabel(/Nome do preço especial/).fill('Associado');
  await page.getByRole('button', { name: 'Criar clube e enviar convite' }).click();
  await expect(page.getByText('Clube criado e convite enviado.')).toBeVisible();

  // Mesmo endereço de novo: recusado.
  await page.goto('/painel/clubes/novo');
  await page.getByLabel('Nome do clube').fill(nome);
  await page.getByLabel('E-mail do primeiro organizador').fill(emailOrg);
  await page.getByRole('button', { name: 'Criar clube e enviar convite' }).click();
  await expect(page.getByText(/Já existe um clube com o endereço/)).toBeVisible();

  // O organizador convidado cai direto no clube e vê que falta conectar o Mercado Pago.
  const ctx = await browser.newContext();
  const org = await ctx.newPage();
  await entrar(org, emailOrg, '/entrar?voltar=/painel');
  await expect(org).toHaveURL(new RegExp(`/painel/c/clube-e2e-${t}$`));
  await org.goto(`/painel/c/clube-e2e-${t}/pagamento`);
  await expect(org.getByText('Conecte a conta Mercado Pago do clube', { exact: false })).toBeVisible();
  // Organizador comum não cria clubes.
  await org.goto('/painel/clubes/novo');
  await expect(org.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  await ctx.close();
});

/** Data (AAAA-MM-DD) daqui a `dias` dias, para o teste não envelhecer. */
const daqui = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

test('organizador cria, publica e acompanha um evento', async ({ page, browser }) => {
  const nome = `Simulado E2E ${Date.now()}`;
  const cpfSocio = cpfAleatorio();

  // Organizador do seed entra direto no clube.
  await entrar(page, 'organizador@exemplo.com', '/entrar?voltar=/painel');
  await expect(page).toHaveURL(/\/painel\/c\/cf-assessoria$/);

  // Sócios
  await page.getByRole('link', { name: 'Sócios' }).click();
  await page.getByLabel('Lista', { exact: true }).fill(`CPF;Nome\n${cpfSocio};Sócia E2E\n123.456.789-00;Inválido`);
  await page.getByRole('button', { name: 'Importar' }).click();
  await expect(page.getByText(/1 sócio\(s\) importado/)).toBeVisible();
  await expect(page.getByText('123.456.789-00;Inválido')).toBeVisible();

  // Novo evento
  await page.getByRole('link', { name: 'Eventos' }).click();
  await page.getByRole('link', { name: '+ Novo evento' }).click();
  await page.getByLabel('Nome do evento').fill(nome);
  await page.getByLabel('Data e hora da largada').fill(`${daqui(120)}T06:00`);
  await page.getByLabel('Local', { exact: true }).fill('Orla (teste)');
  await page.getByLabel('Inscrições até (dia, inclusive)').fill(daqui(116));
  await page.getByLabel(/Transferência até/).fill(daqui(110));
  await page.getByLabel(/Informações para o atleta/).fill('Kit: camisa e medalha.');
  await page.getByLabel(/Preço diferenciado para sócio/).check();
  await page.getByLabel(/Categoria por idade/).uncheck(); // sem categoria: o formulário não pede sexo
  await page.getByLabel('Distância', { exact: true }).first().fill('5 km');
  await page.getByLabel('Preço (R$)').first().fill('50,00');
  await page.getByLabel('Preço sócio (R$)').first().fill('40');
  await page.getByRole('button', { name: '+ Adicionar distância' }).click();
  await page.getByLabel('Distância', { exact: true }).nth(1).fill('10 km');
  await page.getByLabel('Preço (R$)').nth(1).fill('70');
  await page.getByLabel('Limite de vagas').nth(1).fill('50');
  await page.getByRole('button', { name: 'Criar evento (rascunho)' }).click();
  await expect(page.getByText('Evento criado como rascunho.')).toBeVisible();

  // Imagem do evento
  await page.locator('#capa').setInputFiles({ name: 'capa.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('button', { name: 'Remover' }).first()).toBeVisible();

  // Rascunho: organizador vê a página; publicar
  const linkPagina = await page.getByRole('link', { name: 'Ver página' }).getAttribute('href');
  expect(linkPagina).toMatch(/^\/eventos\/simulado-e2e-/);
  await page.getByRole('button', { name: 'Publicar' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Publicado').first()).toBeVisible();

  // Cupom
  await page.getByRole('link', { name: 'Cupons' }).click();
  await page.getByLabel('Código', { exact: true }).fill('E2E10');
  await page.getByLabel('Desconto (%)').fill('10');
  await page.getByLabel('Limite de usos').fill('5');
  await page.getByRole('button', { name: 'Criar cupom' }).click();
  await expect(page.getByRole('cell', { name: 'E2E10' })).toBeVisible();

  // Atleta (outro navegador) se inscreve como sócio e paga (simulado)
  const ctx = await browser.newContext();
  const atleta = await ctx.newPage();
  await atleta.goto(linkPagina!);
  await expect(atleta.getByRole('heading', { name: nome })).toBeVisible();
  await expect(atleta.getByText('Kit: camisa e medalha.')).toBeVisible();
  await atleta.getByRole('link', { name: 'Inscrever-se' }).click();
  await atleta.getByLabel('E-mail').fill(`socia+${Date.now()}@exemplo.com`);
  await atleta.getByRole('button', { name: 'Receber código' }).click();
  await atleta.getByLabel('Código').fill('123456');
  await atleta.getByRole('button', { name: 'Entrar' }).click();
  const r = atleta.getByRole('region', { name: 'Seus dados' });
  await r.getByRole('button', { name: /5 km/ }).click();
  await r.getByLabel('CPF').fill(cpfSocio);
  await expect(r.getByText(/^Preço /)).toBeVisible();
  await r.getByLabel('Nome completo').fill('Sócia E2E');
  await r.getByLabel('Nascimento').fill('1990-05-05');
  await expect(r.getByLabel('Sexo')).toHaveCount(0);
  await r.getByLabel('WhatsApp').fill('11988887777');
  await r.getByLabel('Camisa').selectOption('M');
  await r.getByLabel('Contato de emergência').fill('Fulano 11977776666');
  await atleta.getByRole('checkbox').check();
  await atleta.getByRole('button', { name: 'Pagar R$ 40,00 com Pix' }).click();
  await atleta.getByRole('button', { name: 'Modo teste: simular Pix recebido' }).click();
  await expect(atleta.getByRole('heading', { name: 'Inscrição confirmada' })).toBeVisible();
  await ctx.close();

  // Organizador vê a inscrição, baixa a planilha e cancela
  await page.getByRole('link', { name: 'Inscritos' }).click();
  await expect(page.locator('td b', { hasText: 'Sócia E2E' })).toBeVisible();
  await expect(page.getByText('R$ 40,00').first()).toBeVisible();
  const planilha = await page.request.get(page.url().replace(/\/?$/, '/planilha'));
  expect(planilha.status()).toBe(200);
  const texto = await planilha.text();
  expect(texto).toContain('Sócia E2E');
  expect(texto).toContain('Fulano 11977776666');
  expect(texto).toMatch(/sócio/i);

  await page.getByRole('button', { name: 'Cancelar inscrição de Sócia E2E' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('cell', { name: 'Cancelada', exact: true })).toBeVisible();

  // Cor de destaque do clube: o botão da página do evento passa a usar a cor escolhida.
  await page.getByRole('link', { name: 'Perfil do clube' }).click();
  await page.getByLabel('Cor de destaque').fill('#0E6B4A');
  await page.getByRole('button', { name: 'Salvar perfil' }).click();
  await expect(page.getByText('Perfil salvo.')).toBeVisible();
  const visitante = await browser.newPage();
  await visitante.goto(linkPagina!);
  await expect(visitante.getByRole('link', { name: 'Inscrever-se' })).toHaveCSS('background-color', 'rgb(14, 107, 74)');
  await visitante.close();
  await page.getByLabel('Cor de destaque').fill('');
  await page.getByRole('button', { name: 'Salvar perfil' }).click();
  await expect(page.getByText('Perfil salvo.')).toBeVisible();
});
