import 'server-only';
import { and, count, eq, gt, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { limitesUso } from '@/db/schema';
import { formatarCpf } from '@/lib/regras/cpf';

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

const HORA = 60 * 60 * 1000;

/**
 * Dizer QUAL CPF já tem inscrição revela um dado pessoal (LGPD). Toda resposta assim (consulta do formulário,
 * "criar pedido" e transferência) usa o mesmo limite por conta: 60 por hora, chave "cpf:<conta>".
 * Passado o limite, a resposta é genérica (sexta e sétima varreduras de segurança, 14/11/2026).
 */
export const LIMITE_CONSULTA_CPF = { maximo: 60, janelaMs: HORA } as const;
export const MENSAGEM_CPF_JA_INSCRITO_GENERICA = 'Um dos CPFs já tem inscrição neste evento.';

export async function mensagemCpfJaInscrito(usuarioId: string, cpfs: string[]): Promise<string> {
  const { maximo, janelaMs } = LIMITE_CONSULTA_CPF;
  if (!(await dentroDoLimite(`cpf:${usuarioId}`, maximo, janelaMs))) return MENSAGEM_CPF_JA_INSCRITO_GENERICA;
  return `Já existe inscrição neste evento para o CPF ${cpfs.map(formatarCpf).join(', ')}.`;
}

/**
 * Procurar um cupom diz se ele existe. A tela de cupom e o "criar pedido" usam o mesmo limite por conta:
 * 20 por hora, chave "cupom:<conta>" (sétima varredura de segurança, 14/11/2026).
 */
export const LIMITE_CUPOM = { maximo: 20, janelaMs: HORA } as const;
export const MENSAGEM_LIMITE_CUPOM = 'Muitas tentativas de cupom. Espere um pouco.';

export function cupomDentroDoLimite(usuarioId: string): Promise<boolean> {
  return dentroDoLimite(`cupom:${usuarioId}`, LIMITE_CUPOM.maximo, LIMITE_CUPOM.janelaMs);
}
