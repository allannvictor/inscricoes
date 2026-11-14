import 'server-only';
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { distancias, inscricoes, pedidos, usuarios } from '@/db/schema';
import { limparCpf } from '@/lib/regras/cpf';
import { ehUuid } from '@/lib/regras/uuid';
import { textoDoParametro } from '@/lib/regras/parametros';

/** Inscrições do evento com distância e pedido. "pendente" só conta enquanto o Pix não venceu. */
export async function listarInscritos(eventoId: string, filtrosBrutos: { busca?: unknown; distanciaId?: unknown; status?: unknown } = {}) {
  // Filtros vêm da URL: só texto vale (lista ou outro tipo é ignorado, em vez de erro 500).
  const filtros = { busca: textoDoParametro(filtrosBrutos.busca), distanciaId: textoDoParametro(filtrosBrutos.distanciaId), status: textoDoParametro(filtrosBrutos.status) };
  const condicoes: SQL[] = [eq(inscricoes.eventoId, eventoId)];
  const status = filtros.status ?? 'ativas';
  if (status === 'ativas') condicoes.push(inArray(inscricoes.status, ['confirmada', 'pendente', 'cancelada']));
  else if (['confirmada', 'pendente', 'cancelada', 'expirada'].includes(status)) condicoes.push(eq(inscricoes.status, status));
  if (filtros.distanciaId && ehUuid(filtros.distanciaId)) condicoes.push(eq(inscricoes.distanciaId, filtros.distanciaId));
  // Sem caracteres de controle (o nulo dava erro no banco) e no máximo 100 caracteres.
  const busca = filtros.busca?.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 100);
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
      // Nome de quem tinha a inscrição antes da última transferência (se houve).
      transferidaDe: sql<string | null>`(select t.dados_anteriores->>'nome' from transferencias t where t.inscricao_id = "inscricoes"."id" order by t.criado_em desc limit 1)`,
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
