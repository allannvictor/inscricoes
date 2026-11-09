import 'server-only';
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { distancias, inscricoes, pedidos, usuarios } from '@/db/schema';
import { limparCpf } from '@/lib/regras/cpf';

/** Inscrições do evento com distância e pedido. "pendente" só conta enquanto o Pix não venceu. */
export async function listarInscritos(eventoId: string, filtros: { busca?: string; distanciaId?: string; status?: string } = {}) {
  const condicoes: SQL[] = [eq(inscricoes.eventoId, eventoId)];
  const status = filtros.status ?? 'ativas';
  if (status === 'ativas') condicoes.push(inArray(inscricoes.status, ['confirmada', 'pendente', 'cancelada']));
  else if (['confirmada', 'pendente', 'cancelada', 'expirada'].includes(status)) condicoes.push(eq(inscricoes.status, status));
  if (filtros.distanciaId && /^[0-9a-f-]{36}$/i.test(filtros.distanciaId)) condicoes.push(eq(inscricoes.distanciaId, filtros.distanciaId));
  const busca = filtros.busca?.trim();
  if (busca) {
    const digitos = limparCpf(busca);
    const opcoes: SQL[] = [ilike(inscricoes.nome, `%${busca.replace(/[%_]/g, '')}%`)];
    if (digitos.length >= 3) opcoes.push(ilike(inscricoes.cpf, `%${digitos}%`));
    if (/^\d{1,6}$/.test(busca)) opcoes.push(eq(inscricoes.numero, Number(busca)));
    condicoes.push(or(...opcoes)!);
  }
  return db
    .select({
      inscricao: inscricoes,
      distancia: distancias.nome,
      pedidoStatus: pedidos.status,
      pedidoExpira: pedidos.expiraEm,
      pagoEm: pedidos.pagoEm,
      pedidoId: pedidos.id,
      comprador: usuarios.email,
    })
    .from(inscricoes)
    .innerJoin(distancias, eq(distancias.id, inscricoes.distanciaId))
    .innerJoin(pedidos, eq(pedidos.id, inscricoes.pedidoId))
    .innerJoin(usuarios, eq(usuarios.id, pedidos.compradorId))
    .where(and(...condicoes))
    .orderBy(sql`${inscricoes.numero} is null`, asc(inscricoes.numero), desc(inscricoes.criadoEm));
}

export type LinhaInscrito = Awaited<ReturnType<typeof listarInscritos>>[number];

/** Pendente com Pix já vencido conta como expirada (o banco é atualizado na próxima consulta). */
export function statusVisivel(l: LinhaInscrito): string {
  if (l.inscricao.status === 'pendente' && l.pedidoExpira < new Date()) return 'expirada';
  return l.inscricao.status;
}
