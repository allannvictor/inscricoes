import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/db';
import { clubes, distancias, eventos, inscricoes, pedidos } from '@/db/schema';

/** Evento pelo link. Rascunhos só aparecem com `incluirRascunho` (organizador conferindo antes de publicar). */
export const eventoPorSlug = cache(async (slug: string, incluirRascunho = false) => {
  const [linha] = await db
    .select({ evento: eventos, clube: clubes })
    .from(eventos)
    .innerJoin(clubes, eq(clubes.id, eventos.clubeId))
    .where(and(eq(eventos.slug, slug), inArray(eventos.status, incluirRascunho ? ['publicado', 'encerrado', 'rascunho'] : ['publicado', 'encerrado'])));
  if (!linha) return null;
  const lista = await db.select().from(distancias).where(eq(distancias.eventoId, linha.evento.id)).orderBy(asc(distancias.ordem), asc(distancias.precoCentavos));
  return { ...linha, distancias: lista };
});

export async function eventosAbertos() {
  return db
    .select({ evento: eventos, clube: clubes })
    .from(eventos)
    .innerJoin(clubes, eq(clubes.id, eventos.clubeId))
    .where(eq(eventos.status, 'publicado'))
    .orderBy(asc(eventos.dataHora));
}

export async function pedidoCompleto(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [linha] = await db
    .select({ pedido: pedidos, evento: eventos, clube: clubes })
    .from(pedidos)
    .innerJoin(eventos, eq(eventos.id, pedidos.eventoId))
    .innerJoin(clubes, eq(clubes.id, eventos.clubeId))
    .where(eq(pedidos.id, id));
  if (!linha) return null;
  const lista = await db
    .select({ inscricao: inscricoes, distancia: distancias.nome })
    .from(inscricoes)
    .innerJoin(distancias, eq(distancias.id, inscricoes.distanciaId))
    .where(eq(inscricoes.pedidoId, id))
    .orderBy(asc(inscricoes.criadoEm), asc(inscricoes.id));
  return { ...linha, inscricoes: lista };
}

export function inscricoesAbertas(evento: { status: string; inscricoesAte: Date }): boolean {
  return evento.status === 'publicado' && new Date() <= evento.inscricoesAte;
}
