'use server';

/**
 * Ações chamadas pelas telas (Server Actions). Todas rodam no servidor.
 */
import { redirect } from 'next/navigation';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { cupons, eventos, inscricoes, socios, usuarios } from '@/db/schema';
import { solicitarCodigo, verificarCodigo } from '@/lib/auth/codigo-email';
import { encerrarSessao, usuarioAtual } from '@/lib/auth/sessao';
import { entrarComSenha, gerarHashSenha } from '@/lib/auth/senha';
import { problemaDaSenha, SENHA_MAXIMO } from '@/lib/regras/senha';
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

export async function entrarComSenhaAcao(email: string, senha: string): Promise<{ ok: boolean; erro?: string }> {
  if (!emailValido(email)) return { ok: false, erro: 'Digite um e-mail válido.' };
  if (!senha) return { ok: false, erro: 'Digite a senha.' };
  return entrarComSenha(email, senha.slice(0, SENHA_MAXIMO));
}

/** Cria ou troca a senha de quem está logado. Ter entrado (por código, Google ou senha) já prova que o e-mail é da pessoa. */
export async function definirSenhaAcao(senha: string): Promise<{ ok: boolean; erro?: string }> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: 'Entre de novo para continuar.' };
  const problema = problemaDaSenha(senha, usuario.email);
  if (problema) return { ok: false, erro: problema };
  await db.update(usuarios).set({ senhaHash: await gerarHashSenha(senha) }).where(eq(usuarios.id, usuario.id));
  return { ok: true };
}

export async function removerSenhaAcao(): Promise<{ ok: boolean; erro?: string }> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: 'Entre de novo para continuar.' };
  await db.update(usuarios).set({ senhaHash: null }).where(eq(usuarios.id, usuario.id));
  return { ok: true };
}

export async function sairAcao(): Promise<void> {
  await encerrarSessao();
  redirect('/');
}

/**
 * Para o formulário: o CPF é sócio do clube (se o evento tiver preço de sócio)?
 * Já tem inscrição ativa neste evento? (o servidor bloqueia de novo ao pagar)
 */
export async function verificarCpfAcao(eventoId: string, cpf: string): Promise<{ socio: boolean; jaInscrito: boolean }> {
  const nada = { socio: false, jaInscrito: false };
  if (!(await usuarioAtual())) return nada;
  const limpo = limparCpf(cpf);
  if (!validarCpf(limpo)) return nada;
  const [evento] = await db.select({ clubeId: eventos.clubeId, ativo: eventos.precoSocioAtivo }).from(eventos).where(eq(eventos.id, eventoId));
  if (!evento) return nada;
  const [inscrito] = await db
    .select({ id: inscricoes.id })
    .from(inscricoes)
    .where(and(eq(inscricoes.eventoId, eventoId), eq(inscricoes.cpf, limpo), inArray(inscricoes.status, ['pendente', 'confirmada'])))
    .limit(1);
  let socio = false;
  if (evento.ativo) {
    const [achado] = await db.select({ cpf: socios.cpf }).from(socios).where(and(eq(socios.clubeId, evento.clubeId), eq(socios.cpf, limpo)));
    socio = !!achado;
  }
  return { socio, jaInscrito: !!inscrito };
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
