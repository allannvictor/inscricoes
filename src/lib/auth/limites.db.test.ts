/**
 * Testes de limite de tentativas COM o banco (Postgres local ou do CI), disparando tentativas simultâneas.
 * Garantem que palpites em paralelo não escapam do limite, que tentativas já bloqueadas não são gravadas
 * e que cada código vale uma vez só (varreduras de segurança de 14/11/2026).
 * Precisam do banco migrado (`npm run db:migrate`); sem DATABASE_URL, são pulados.
 */
import { config } from 'dotenv';
import { afterAll, describe, expect, it, vi } from 'vitest';

config({ path: '.env.local' });
config();

const espiao = vi.hoisted(() => ({ emails: [] as Array<{ para: string; assunto: string }>, sessoes: 0 }));

vi.mock('server-only', () => ({}));
vi.mock('./ip', () => ({ hashDoIp: async () => 'ip-de-teste-' + process.pid + '-' + Math.floor(Date.now() / 1000) }));
vi.mock('./sessao', () => ({ criarSessao: async () => void espiao.sessoes++ }));
vi.mock('@/lib/email/enviar', () => ({ enviarEmail: async (e: { para: string; assunto: string }) => void espiao.emails.push(e) }));
vi.mock('@/lib/ambiente', () => ({ codigoTesteAtivo: () => null }));

const temBanco = !!process.env.DATABASE_URL;
const sufixo = `${Date.now()}-${process.pid}`;
const emailDe = (nome: string) => `${nome}+${sufixo}@exemplo.invalid`;

describe.skipIf(!temBanco)('limites de tentativas com acessos simultâneos', () => {
  afterAll(async () => {
    const { db } = await import('@/db');
    const { codigosLogin, limitesUso, tentativasSenha, usuarios } = await import('@/db/schema');
    const { like } = await import('drizzle-orm');
    // Apaga o que os testes criaram.
    await db.delete(tentativasSenha).where(like(tentativasSenha.email, `%+${sufixo}@exemplo.invalid`));
    await db.delete(codigosLogin).where(like(codigosLogin.email, `%+${sufixo}@exemplo.invalid`));
    await db.delete(usuarios).where(like(usuarios.email, `%+${sufixo}@exemplo.invalid`));
    await db.delete(limitesUso).where(like(limitesUso.chave, `teste:${sufixo}%`));
    await (db.$client as unknown as { end: () => Promise<void> }).end();
  });

  it('senha: de 20 tentativas erradas simultâneas, entre 1 e 5 são conferidas, e as bloqueadas não são gravadas', async () => {
    const { db } = await import('@/db');
    const { tentativasSenha, usuarios } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    const { entrarComSenha, gerarHashSenha } = await import('./senha');
    const email = emailDe('paralelo-senha');
    await db.insert(usuarios).values({ email, senhaHash: await gerarHashSenha('a senha certa de verdade') });

    const r = await Promise.all(Array.from({ length: 20 }, () => entrarComSenha(email, 'senha errada')));
    const conferidas = r.filter((x) => !x.ok && x.erro.startsWith('E-mail ou senha incorretos')).length;
    expect(conferidas).toBeGreaterThanOrEqual(1);
    expect(conferidas).toBeLessThanOrEqual(5);
    expect(r.every((x) => !x.ok)).toBe(true);

    // Só as tentativas conferidas viram registro (as bloqueadas não enchem o banco).
    const gravadas = await db.select().from(tentativasSenha).where(eq(tentativasSenha.email, email));
    expect(gravadas.length).toBe(conferidas);
    for (let i = 0; i < 30; i++) await entrarComSenha(email, 'mais uma errada');
    expect((await db.select().from(tentativasSenha).where(eq(tentativasSenha.email, email))).length).toBe(conferidas);

    // Mesmo a senha certa fica bloqueada até passar a janela.
    expect((await entrarComSenha(email, 'a senha certa de verdade')).ok).toBe(false);
  });

  it('código: de 30 palpites simultâneos, entre 1 e 5 são conferidos', async () => {
    const { solicitarCodigo, verificarCodigo } = await import('./codigo-email');
    const email = emailDe('paralelo-codigo');
    expect((await solicitarCodigo(email)).ok).toBe(true);
    const codigo = espiao.emails.findLast((e) => e.para === email)!.assunto.slice(0, 6);
    const errado = codigo === '000000' ? '111111' : '000000';

    const r = await Promise.all(Array.from({ length: 30 }, () => verificarCodigo(email, errado)));
    const conferidos = r.filter((x) => !x.ok && x.erro.startsWith('Código incorreto')).length;
    expect(conferidos).toBeGreaterThanOrEqual(1);
    expect(conferidos).toBeLessThanOrEqual(5);
  });

  it('código certo enviado 10 vezes ao mesmo tempo abre UMA sessão só', async () => {
    const { solicitarCodigo, verificarCodigo } = await import('./codigo-email');
    const email = emailDe('codigo-unico');
    expect((await solicitarCodigo(email)).ok).toBe(true);
    const codigo = espiao.emails.findLast((e) => e.para === email)!.assunto.slice(0, 6);
    const antes = espiao.sessoes;
    const r = await Promise.all(Array.from({ length: 10 }, () => verificarCodigo(email, codigo)));
    expect(r.filter((x) => x.ok).length).toBe(1);
    expect(espiao.sessoes - antes).toBe(1);
  });

  it('código: pedidos simultâneos não passam de 5 por hora por e-mail', async () => {
    const { solicitarCodigo } = await import('./codigo-email');
    const email = emailDe('paralelo-pedidos');
    const r = await Promise.all(Array.from({ length: 12 }, () => solicitarCodigo(email)));
    expect(r.filter((x) => x.ok).length).toBe(5);
  });

  it('limite genérico: 30 usos simultâneos com máximo 5 → exatamente 5 aceitos e 5 gravados', async () => {
    const { db } = await import('@/db');
    const { limitesUso } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    const { dentroDoLimite } = await import('@/lib/limites');
    const chave = `teste:${sufixo}:generico`;
    const r = await Promise.all(Array.from({ length: 30 }, () => dentroDoLimite(chave, 5, 60_000)));
    expect(r.filter(Boolean).length).toBe(5);
    expect((await db.select().from(limitesUso).where(eq(limitesUso.chave, chave))).length).toBe(5);
  });
});
