import 'server-only';
import { and, count, eq, gt, lt } from 'drizzle-orm';
import { db } from '@/db';
import { limitesUso } from '@/db/schema';

/**
 * Limite simples por chave (ex.: "cpf:<usuário>"). Registra o uso ANTES de contar, assim usos simultâneos
 * também respeitam o limite. Devolve true se ainda está dentro do limite.
 */
export async function dentroDoLimite(chave: string, maximo: number, janelaMs: number): Promise<boolean> {
  const desde = new Date(Date.now() - janelaMs);
  await db.insert(limitesUso).values({ chave });
  const [{ total }] = await db.select({ total: count() }).from(limitesUso).where(and(eq(limitesUso.chave, chave), gt(limitesUso.criadoEm, desde)));
  // Limpeza: registros antigos desta chave não servem mais.
  await db.delete(limitesUso).where(and(eq(limitesUso.chave, chave), lt(limitesUso.criadoEm, desde)));
  return total <= maximo;
}
