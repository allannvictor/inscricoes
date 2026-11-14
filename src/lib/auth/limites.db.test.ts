/**
 * Testes de limite de tentativas COM o banco (Postgres local ou do CI), disparando tentativas simultâneas.
 * Garantem que palpites em paralelo não escapam do limite (falha encontrada na varredura de 14/11/2026).
 * Precisam do banco migrado (`npm run db:migrate`); sem DATABASE_URL, são pulados.
 */
import { config } from 'dotenv';
import { afterAll, describe, expect, it, vi } from 'vitest';

config({ path: '.env.local' });
config();

vi.mock('server-only', () => ({}));
vi.mock('./ip', () => ({ hashDoIp: async () => 'ip-de-teste-' + process.pid }));
vi.mock('./sessao', () => ({ criarSessao: async () => {} }));
vi.mock('@/lib/email/enviar', () => ({ enviarEmail: async () => {} }));
vi.mock('@/lib/ambiente', () => ({ codigoTesteAtivo: () => null }));

const temBanco = !!process.env.DATABASE_URL;

describe.skipIf(!temBanco)('limites de tentativas com acessos simultâneos', () => {
  afterAll(async () => {
    const { db } = await import('@/db');
    await (db.$client as unknown as { end: () => Promise<void> }).end();
  });

  it('senha: de 20 tentativas erradas simultâneas, no máximo 5 chegam a ser conferidas', async () => {
    const { db } = await import('@/db');
    const { usuarios } = await import('@/db/schema');
    const { entrarComSenha, gerarHashSenha } = await import('./senha');
    const email = `paralelo-senha+${Date.now()}@exemplo.invalid`;
    await db.insert(usuarios).values({ email, senhaHash: await gerarHashSenha('a senha certa de verdade') });

    const r = await Promise.all(Array.from({ length: 20 }, () => entrarComSenha(email, 'senha errada')));
    const conferidas = r.filter((x) => !x.ok && x.erro.startsWith('E-mail ou senha incorretos')).length;
    expect(conferidas).toBeLessThanOrEqual(5);
    expect(r.every((x) => !x.ok)).toBe(true);
    // Mesmo a senha certa fica bloqueada até passar a janela.
    expect((await entrarComSenha(email, 'a senha certa de verdade')).ok).toBe(false);
  });

  it('código: de 30 palpites simultâneos, no máximo 5 são conferidos; e cada código vale uma vez', async () => {
    const { solicitarCodigo, verificarCodigo } = await import('./codigo-email');
    const email = `paralelo-codigo+${Date.now()}@exemplo.invalid`;
    expect((await solicitarCodigo(email)).ok).toBe(true);

    const palpites = Array.from({ length: 30 }, (_, i) => String(i).padStart(6, '0'));
    const r = await Promise.all(palpites.map((p) => verificarCodigo(email, p)));
    const conferidos = r.filter((x) => !x.ok && x.erro.startsWith('Código incorreto')).length;
    const acertos = r.filter((x) => x.ok).length;
    expect(conferidos + acertos).toBeLessThanOrEqual(5);
  });

  it('código: pedidos simultâneos não passam de 5 por hora por e-mail', async () => {
    const { solicitarCodigo } = await import('./codigo-email');
    const email = `paralelo-pedidos+${Date.now()}@exemplo.invalid`;
    const r = await Promise.all(Array.from({ length: 12 }, () => solicitarCodigo(email)));
    expect(r.filter((x) => x.ok).length).toBe(5);
  });
});
