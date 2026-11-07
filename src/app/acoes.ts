'use server';

/**
 * Ações chamadas pelas telas (Server Actions). Todas rodam no servidor.
 */
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { cupons, eventos, socios } from '@/db/schema';
import { solicitarCodigo, verificarCodigo } from '@/lib/auth/codigo-email';
import { encerrarSessao, usuarioAtual } from '@/lib/auth/sessao';
import { criarPedido, type ResultadoCriacao } from '@/lib/pedidos/servico';
import { limparCpf, validarCpf } from '@/lib/regras/cpf';

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export async function solicitarCodigoAcao(email: string): Promise<{ ok: boolean; erro?: string }> {
  if (!emailValido(email)) return { ok: false, erro: 'Digite um e-mail válido.' };
  try {
    return await solicitarCodigo(email);
  } catch (e) {
    console.error(e);
    return { ok: false, erro: 'Não conseguimos enviar o código agora. Tente de novo.' };
  }
}

export async function verificarCodigoAcao(email: string, codigo: string): Promise<{ ok: boolean; erro?: string }> {
  if (!emailValido(email)) return { ok: false, erro: 'Digite um e-mail válido.' };
  return verificarCodigo(email, codigo);
}

export async function sairAcao(): Promise<void> {
  await encerrarSessao();
  redirect('/');
}

/** Diz se o CPF está na lista de sócios do clube do evento (só quando o evento tem preço de sócio). */
export async function verificarSocioAcao(eventoId: string, cpf: string): Promise<boolean> {
  if (!(await usuarioAtual())) return false;
  const limpo = limparCpf(cpf);
  if (!validarCpf(limpo)) return false;
  const [evento] = await db.select({ clubeId: eventos.clubeId, ativo: eventos.precoSocioAtivo }).from(eventos).where(eq(eventos.id, eventoId));
  if (!evento?.ativo) return false;
  const [achado] = await db.select({ cpf: socios.cpf }).from(socios).where(and(eq(socios.clubeId, evento.clubeId), eq(socios.cpf, limpo)));
  return !!achado;
}

export type CupomValidado = { ok: true; codigo: string; tipo: 'percentual' | 'valor'; valor: number } | { ok: false; erro: string };

export async function validarCupomAcao(eventoId: string, codigo: string): Promise<CupomValidado> {
  const c = codigo.trim().toUpperCase();
  if (!c) return { ok: false, erro: 'Digite o código do cupom.' };
  const [cupom] = await db.select().from(cupons).where(and(eq(cupons.eventoId, eventoId), eq(cupons.codigo, c), eq(cupons.ativo, true)));
  if (!cupom) return { ok: false, erro: 'Cupom não encontrado.' };
  return { ok: true, codigo: c, tipo: cupom.tipo as 'percentual' | 'valor', valor: cupom.valor };
}

export async function criarPedidoAcao(entrada: unknown): Promise<ResultadoCriacao> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erros: ['Sua sessão expirou. Entre de novo com seu e-mail.'] };
  try {
    return await criarPedido(usuario, entrada);
  } catch (e) {
    console.error(e);
    return { ok: false, erros: ['Algo deu errado ao criar seu pedido. Tente de novo.'] };
  }
}
