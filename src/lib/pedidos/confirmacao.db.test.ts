/**
 * Pix pago depois de o organizador cancelar a inscrição: a inscrição cancelada NÃO volta a valer
 * (terceira varredura de segurança, 14/11/2026). Usa o banco local/CI com o seed (evento "simulado-10k-dezembro").
 */
import { randomInt } from 'node:crypto';
import { config } from 'dotenv';
import { afterAll, describe, expect, it, vi } from 'vitest';

config({ path: '.env.local' });
config();

vi.mock('server-only', () => ({}));
vi.mock('@/lib/email/enviar', () => ({ enviarEmail: async () => {} }));

const temBanco = !!process.env.DATABASE_URL;
const sufixo = `${Date.now()}-${process.pid}`;

function cpf(): string {
  const n = Array.from({ length: 9 }, () => randomInt(10));
  const dv = (b: number[], p: number) => ((b.reduce((s, d, i) => s + d * (p - i), 0) * 10) % 11) % 10;
  n.push(dv(n, 10));
  n.push(dv(n, 11));
  return n.join('');
}

describe.skipIf(!temBanco)('confirmarPagamento com inscrição cancelada', () => {
  const criados: string[] = [];

  afterAll(async () => {
    const { db } = await import('@/db');
    const { inscricoes, pedidos, usuarios } = await import('@/db/schema');
    const { inArray, like } = await import('drizzle-orm');
    if (criados.length) {
      await db.delete(inscricoes).where(inArray(inscricoes.pedidoId, criados));
      await db.delete(pedidos).where(inArray(pedidos.id, criados));
    }
    await db.delete(usuarios).where(like(usuarios.email, `%+${sufixo}@exemplo.invalid`));
    await (db.$client as unknown as { end: () => Promise<void> }).end();
  });

  async function pedidoCom(statusDasInscricoes: string[]) {
    const { db } = await import('@/db');
    const { distancias, eventos, inscricoes, pedidos, usuarios } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    const [evento] = await db.select().from(eventos).where(eq(eventos.slug, 'simulado-10k-dezembro'));
    const [dist] = await db.select().from(distancias).where(eq(distancias.eventoId, evento.id));
    const [u] = await db.insert(usuarios).values({ email: `comprador-${criados.length}+${sufixo}@exemplo.invalid` }).returning();
    const [p] = await db
      .insert(pedidos)
      .values({ eventoId: evento.id, compradorId: u.id, subtotalCentavos: 1000, totalCentavos: 1000, provedor: 'simulado', expiraEm: new Date(Date.now() + 30 * 60_000) })
      .returning();
    criados.push(p.id);
    const lista = await db
      .insert(inscricoes)
      .values(
        statusDasInscricoes.map((status, i) => ({
          pedidoId: p.id,
          eventoId: evento.id,
          distanciaId: dist.id,
          nome: `Pessoa ${i}`,
          cpf: cpf(),
          nascimento: '1990-01-01',
          precoCentavos: 500,
          status,
        })),
      )
      .returning();
    return { pedido: p, lista };
  }

  it('confirma só as inscrições não canceladas', async () => {
    const { db } = await import('@/db');
    const { inscricoes } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    const { confirmarPagamento } = await import('./servico');
    const { pedido, lista } = await pedidoCom(['pendente', 'cancelada']);
    expect(await confirmarPagamento(pedido.id, null)).toBe(true);
    const depois = await db.select().from(inscricoes).where(eq(inscricoes.pedidoId, pedido.id));
    const porId = new Map(depois.map((i) => [i.id, i]));
    expect(porId.get(lista[0].id)!.status).toBe('confirmada');
    expect(porId.get(lista[1].id)!.status).toBe('cancelada');
    expect(porId.get(lista[1].id)!.numero).toBeNull();
  });

  it('se todas foram canceladas, o pedido fica para a organização resolver (pago_conflito)', async () => {
    const { db } = await import('@/db');
    const { inscricoes, pedidos } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    const { confirmarPagamento } = await import('./servico');
    const { pedido } = await pedidoCom(['cancelada']);
    expect(await confirmarPagamento(pedido.id, null)).toBe(false);
    const [p] = await db.select().from(pedidos).where(eq(pedidos.id, pedido.id));
    expect(p.status).toBe('pago_conflito');
    const [i] = await db.select().from(inscricoes).where(eq(inscricoes.pedidoId, pedido.id));
    expect(i.status).toBe('cancelada');
  });
});
