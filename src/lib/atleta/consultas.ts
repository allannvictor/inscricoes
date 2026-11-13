import 'server-only';
import { and, asc, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { clubes, distancias, eventos, inscricoes, pedidos } from '@/db/schema';
import type { UsuarioAtual } from '@/lib/auth/sessao';

/**
 * Inscrições que o atleta pode ver em "Minhas inscrições":
 * as dos pedidos que ele pagou e as feitas no CPF ou e-mail dele por outra pessoa.
 * Pix vencido não aparece (vira ruído); canceladas aparecem para ninguém achar que sumiu.
 */
export async function minhasInscricoes(usuario: UsuarioAtual) {
  const minhas: SQL[] = [eq(pedidos.compradorId, usuario.id), sql`lower(${inscricoes.email}) = ${usuario.email.toLowerCase()}`];
  if (usuario.cpf) minhas.push(eq(inscricoes.cpf, usuario.cpf));
  const linhas = await db
    .select({
      inscricao: inscricoes,
      distancia: distancias.nome,
      evento: eventos,
      clube: clubes.nome,
      pedido: { id: pedidos.id, compradorId: pedidos.compradorId, status: pedidos.status, expiraEm: pedidos.expiraEm },
    })
    .from(inscricoes)
    .innerJoin(pedidos, eq(pedidos.id, inscricoes.pedidoId))
    .innerJoin(eventos, eq(eventos.id, inscricoes.eventoId))
    .innerJoin(clubes, eq(clubes.id, eventos.clubeId))
    .innerJoin(distancias, eq(distancias.id, inscricoes.distanciaId))
    .where(and(or(...minhas), inArray(inscricoes.status, ['confirmada', 'pendente', 'cancelada'])))
    .orderBy(asc(eventos.dataHora), asc(inscricoes.numero), desc(inscricoes.criadoEm));
  const agora = new Date();
  return linhas.filter((l) => !(l.inscricao.status === 'pendente' && l.pedido.expiraEm < agora));
}

export type MinhaInscricao = Awaited<ReturnType<typeof minhasInscricoes>>[number];

/** Uma inscrição com tudo que o comprovante e a transferência precisam. */
export async function inscricaoCompleta(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [linha] = await db
    .select({ inscricao: inscricoes, distancia: distancias.nome, evento: eventos, clube: clubes, pedido: pedidos })
    .from(inscricoes)
    .innerJoin(pedidos, eq(pedidos.id, inscricoes.pedidoId))
    .innerJoin(eventos, eq(eventos.id, inscricoes.eventoId))
    .innerJoin(clubes, eq(clubes.id, eventos.clubeId))
    .innerJoin(distancias, eq(distancias.id, inscricoes.distanciaId))
    .where(eq(inscricoes.id, id));
  return linha ?? null;
}
