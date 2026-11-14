import 'server-only';
import { and, asc, desc, eq, inArray, ne, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { clubes, distancias, eventos, inscricoes, pedidos } from '@/db/schema';
import type { UsuarioAtual } from '@/lib/auth/sessao';
import { ehUuid } from '@/lib/regras/uuid';

/**
 * Inscrições que o atleta pode ver em "Minhas inscrições":
 * as dos pedidos que ele pagou e as feitas no E-MAIL dele por outra pessoa (o CPF não dá acesso: não é segredo).
 * Pix vencido não aparece (vira ruído); canceladas aparecem para ninguém achar que sumiu.
 */
export async function minhasInscricoes(usuario: UsuarioAtual) {
  const minhas: SQL[] = [eq(pedidos.compradorId, usuario.id), sql`lower(${inscricoes.email}) = ${usuario.email.toLowerCase()}`];
  const linhas = await db
    .select({
      inscricao: inscricoes,
      transferida: sql<boolean>`exists (select 1 from "transferencias" where "transferencias"."inscricao_id" = "inscricoes"."id")`,
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
  if (!ehUuid(id)) return null;
  const [linha] = await db
    .select({ inscricao: inscricoes, transferida: sql<boolean>`exists (select 1 from "transferencias" where "transferencias"."inscricao_id" = "inscricoes"."id")`, distancia: distancias.nome, evento: eventos, clube: clubes, pedido: pedidos })
    .from(inscricoes)
    .innerJoin(pedidos, eq(pedidos.id, inscricoes.pedidoId))
    .innerJoin(eventos, eq(eventos.id, inscricoes.eventoId))
    .innerJoin(clubes, eq(clubes.id, eventos.clubeId))
    .innerJoin(distancias, eq(distancias.id, inscricoes.distanciaId))
    .where(eq(inscricoes.id, id));
  return linha ?? null;
}

/**
 * Pessoas que este comprador já inscreveu (exceto ele mesmo), com os dados da inscrição mais recente de cada CPF.
 * Servem para o botão "+ Adicionar: Fulano" no formulário, que preenche tudo de uma vez.
 * São dados que o próprio comprador digitou antes: inscrições transferidas ficam de fora.
 */
export async function pessoasJaInscritas(usuario: UsuarioAtual, limite = 8) {
  const linhas = await db
    .selectDistinctOn([inscricoes.cpf], {
      nome: inscricoes.nome,
      cpf: inscricoes.cpf,
      email: inscricoes.email,
      nascimento: inscricoes.nascimento,
      sexo: inscricoes.sexo,
      telefone: inscricoes.telefone,
      camisa: inscricoes.camisa,
      contatoEmergencia: inscricoes.contatoEmergencia,
      criadoEm: inscricoes.criadoEm,
    })
    .from(inscricoes)
    .innerJoin(pedidos, eq(pedidos.id, inscricoes.pedidoId))
    .where(
      and(
        eq(pedidos.compradorId, usuario.id),
        usuario.cpf ? ne(inscricoes.cpf, usuario.cpf) : undefined,
        // Inscrição transferida tem os dados de OUTRA pessoa, que o comprador nunca recebeu (LGPD). Fica de fora.
        sql`not exists (select 1 from "transferencias" where "transferencias"."inscricao_id" = "inscricoes"."id")`,
      ),
    )
    .orderBy(inscricoes.cpf, desc(inscricoes.criadoEm));
  return linhas
    .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
    .slice(0, limite)
    .map((p) => ({
      nome: p.nome,
      cpf: p.cpf,
      nascimento: p.nascimento,
      email: p.email ?? '',
      sexo: ((p.sexo as 'F' | 'M' | null) ?? '') as 'F' | 'M' | '',
      telefone: p.telefone ?? '',
      camisa: p.camisa ?? '',
      contatoEmergencia: p.contatoEmergencia ?? '',
    }));
}

export type PessoaJaInscrita = Awaited<ReturnType<typeof pessoasJaInscritas>>[number];
