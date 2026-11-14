import 'server-only';
import { and, count, eq, gt, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { limitesUso } from '@/db/schema';

/**
 * Limite simples por chave (ex.: "cpf:<usuário>"). Devolve true se ainda está dentro do limite.
 * Conta e grava numa transação com trava pela chave: usos simultâneos respeitam o limite, e usos JÁ bloqueados
 * não são gravados (ninguém consegue encher o banco). Varreduras de segurança de 14/11/2026.
 */
export async function dentroDoLimite(chave: string, maximo: number, janelaMs: number): Promise<boolean> {
  const desde = new Date(Date.now() - janelaMs);
  const ok = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'limite:' + chave}))`);
    const [{ total }] = await tx.select({ total: count() }).from(limitesUso).where(and(eq(limitesUso.chave, chave), gt(limitesUso.criadoEm, desde)));
    if (total >= maximo) return false;
    await tx.insert(limitesUso).values({ chave });
    return true;
  });
  // De vez em quando, apaga registros com mais de 1 dia (de qualquer chave).
  if (Math.random() < 0.05) await db.delete(limitesUso).where(lt(limitesUso.criadoEm, new Date(Date.now() - 24 * 60 * 60 * 1000)));
  return ok;
}
