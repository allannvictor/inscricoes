'use server';

/**
 * Ações chamadas pelas telas (Server Actions). Todas rodam no servidor.
 */
import { redirect } from 'next/navigation';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { cupons, eventos, inscricoes, socios, usuarios } from '@/db/schema';
import { conferirCodigo, solicitarCodigo, verificarCodigo } from '@/lib/auth/codigo-email';
import { comoObjeto } from '@/lib/regras/parametros';
import { encerrarOutrasSessoes, encerrarSessao, usuarioAtual } from '@/lib/auth/sessao';
import { enviarEmail } from '@/lib/email/enviar';
import { emailAvisoSeguranca } from '@/lib/email/modelos';
import { conferirSenha, entrarComSenha, gerarHashSenha } from '@/lib/auth/senha';
import { problemaDaSenha, SENHA_MAXIMO } from '@/lib/regras/senha';
import { cupomDentroDoLimite, dentroDoLimite, LIMITE_CONSULTA_CPF, MENSAGEM_LIMITE_CUPOM } from '@/lib/limites';
import { CONTROLE } from '@/lib/regras/texto';
import { acaoLiberadaNoPreLancamento } from '@/lib/pre-lancamento-acoes';
import { criarPedido, type ResultadoCriacao } from '@/lib/pedidos/servico';
import { limparCpf, validarCpf } from '@/lib/regras/cpf';
import { resumoDoErro } from '@/lib/log';

import { ehUuid } from '@/lib/regras/uuid';
// E-mail com no máximo 254 caracteres (limite do padrão; também evita gravar textos gigantes no banco).
const emailValido = (e: unknown): e is string => typeof e === 'string' && !CONTROLE.test(e) && e.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
// As ações podem ser chamadas direto, com qualquer tipo de valor: tipo errado vira resposta neutra, sem erro 500.
const ehTexto = (v: unknown, max = 500): v is string => typeof v === 'string' && v.length <= max && !CONTROLE.test(v);

export async function solicitarCodigoAcao(email: string): Promise<{ ok: boolean; erro?: string }> {
  if (!(await acaoLiberadaNoPreLancamento())) return { ok: false, erro: 'Inscrições em breve.' };
  if (!emailValido(email)) return { ok: false, erro: 'Digite um e-mail válido.' };
  try {
    return await solicitarCodigo(email);
  } catch (e) {
    console.error('Falha ao pedir código', resumoDoErro(e));
    return { ok: false, erro: 'Não conseguimos enviar o código agora. Tente de novo.' };
  }
}

export async function verificarCodigoAcao(email: string, codigo: string): Promise<{ ok: boolean; erro?: string }> {
  if (!(await acaoLiberadaNoPreLancamento())) return { ok: false, erro: 'Inscrições em breve.' };
  if (!emailValido(email)) return { ok: false, erro: 'Digite um e-mail válido.' };
  if (!ehTexto(codigo, 20)) return { ok: false, erro: 'O código tem 6 dígitos.' };
  return verificarCodigo(email, codigo);
}

export async function entrarComSenhaAcao(email: string, senha: string): Promise<{ ok: boolean; erro?: string }> {
  if (!(await acaoLiberadaNoPreLancamento())) return { ok: false, erro: 'Inscrições em breve.' };
  if (!emailValido(email)) return { ok: false, erro: 'Digite um e-mail válido.' };
  if (!ehTexto(senha, 10_000) || !senha) return { ok: false, erro: 'Digite a senha.' };
  return entrarComSenha(email, senha.slice(0, SENHA_MAXIMO));
}

/**
 * Quem já tem senha precisa confirmar que é a pessoa para trocar ou remover a senha (pedido do Allan, 14/11/2026):
 * - com a senha atual (mesmos limites do login: 5 erros a cada 15 minutos);
 * - ou, se esqueceu, com um código enviado ao e-mail da conta.
 * Devolve a mensagem de erro, ou null se a confirmação passou.
 */
async function confirmarSenhaAtual(usuario: { email: string; senhaHash: string | null }, confirmacaoBruta: unknown): Promise<string | null> {
  if (!usuario.senhaHash) return null; // ainda não tem senha: criar a primeira não pede confirmação
  const confirmacao = comoObjeto(confirmacaoBruta);
  const { senhaAtual, codigo } = confirmacao;
  if (ehTexto(senhaAtual, 10_000) && senhaAtual) {
    const r = await conferirSenha(usuario.email, senhaAtual.slice(0, SENHA_MAXIMO));
    if (r.ok) return null;
    return r.erro.startsWith('Muitas') ? r.erro : 'A senha atual está incorreta.';
  }
  if (ehTexto(codigo, 20) && codigo) {
    const r = await conferirCodigo(usuario.email, codigo);
    return r.ok ? null : r.erro;
  }
  return 'Digite a senha atual. Se esqueceu, use "Esqueci a senha atual".';
}

/** "Esqueci a senha atual": manda um código para o e-mail da conta (mesmos limites do login). */
export async function enviarCodigoSenhaAcao(): Promise<{ ok: boolean; erro?: string }> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: 'Entre de novo para continuar.' };
  try {
    const r = await solicitarCodigo(usuario.email);
    return r.ok ? { ok: true } : { ok: false, erro: r.erro };
  } catch (e) {
    console.error('Falha ao pedir código (senha)', resumoDoErro(e));
    return { ok: false, erro: 'Não conseguimos enviar o código agora. Tente de novo.' };
  }
}

/** Cria ou troca a senha de quem está logado. Trocar pede a senha atual (ou um código enviado ao e-mail). */
export async function definirSenhaAcao(senha: string, confirmacao?: unknown): Promise<{ ok: boolean; erro?: string }> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: 'Entre de novo para continuar.' };
  if (!ehTexto(senha, 10_000)) return { ok: false, erro: 'Senha inválida.' };
  const problema = problemaDaSenha(senha, usuario.email);
  if (problema) return { ok: false, erro: problema };
  const recusa = await confirmarSenhaAtual(usuario, confirmacao);
  if (recusa) return { ok: false, erro: recusa };
  await db.update(usuarios).set({ senhaHash: await gerarHashSenha(senha) }).where(eq(usuarios.id, usuario.id));
  // Quem tivesse uma sessão roubada perde o acesso; a pessoa recebe um aviso.
  await encerrarOutrasSessoes(usuario.id);
  await avisarSenha(usuario.email, usuario.senhaHash ? 'trocada' : 'criada');
  return { ok: true };
}

async function avisarSenha(email: string, acao: 'criada' | 'trocada' | 'removida') {
  const msg = emailAvisoSeguranca({
    assunto: `Sua senha foi ${acao}`,
    titulo: `Senha ${acao}`,
    linhas: [
      `A senha da sua conta no Inscrições Fast foi ${acao} agora.`,
      acao === 'removida' ? 'Agora você entra só com o código enviado ao e-mail.' : 'Por segurança, saímos da sua conta nos outros aparelhos.',
    ],
    seNaoFoiVoce: 'Entre com o código enviado a este e-mail, vá em Meus dados → Acesso → Trocar senha → "Esqueci a senha atual" e crie uma nova senha (ou remova a senha).',
  });
  await enviarEmail({ para: email, ...msg }).catch((e) => console.error('Aviso de senha não enviado', resumoDoErro(e)));
}

export async function removerSenhaAcao(confirmacao?: unknown): Promise<{ ok: boolean; erro?: string }> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: 'Entre de novo para continuar.' };
  // Remover também pede a senha atual (ou o código): é uma mudança no acesso da conta.
  const recusa = await confirmarSenhaAtual(usuario, confirmacao);
  if (recusa) return { ok: false, erro: recusa };
  await db.update(usuarios).set({ senhaHash: null }).where(eq(usuarios.id, usuario.id));
  await encerrarOutrasSessoes(usuario.id);
  await avisarSenha(usuario.email, 'removida');
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
  if (!(await acaoLiberadaNoPreLancamento())) return { socio: false, jaInscrito: false };
  const nada = { socio: false, jaInscrito: false };
  const usuario = await usuarioAtual();
  if (!usuario || !ehUuid(eventoId) || !ehTexto(cpf, 20)) return nada;
  const limpo = limparCpf(cpf);
  if (!validarCpf(limpo)) return nada;
  // Limite por conta: a consulta revela se um CPF é sócio ou está inscrito (dado pessoal, LGPD).
  if (!(await dentroDoLimite(`cpf:${usuario.id}`, LIMITE_CONSULTA_CPF.maximo, LIMITE_CONSULTA_CPF.janelaMs))) return nada;
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
  if (!(await acaoLiberadaNoPreLancamento())) return { ok: false, erro: 'Inscrições em breve.' };
  if (!ehTexto(codigo, 40)) return { ok: false, erro: 'Cupom não encontrado.' };
  const c = codigo.trim().toUpperCase();
  if (!c) return { ok: false, erro: 'Digite o código do cupom.' };
  if (!ehUuid(eventoId)) return { ok: false, erro: 'Cupom não encontrado.' };
  // Exige login e limita as tentativas, para ninguém adivinhar cupons testando códigos.
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: 'Entre com seu e-mail para usar um cupom.' };
  if (!(await cupomDentroDoLimite(usuario.id))) return { ok: false, erro: MENSAGEM_LIMITE_CUPOM };
  const [cupom] = await db.select().from(cupons).where(and(eq(cupons.eventoId, eventoId), eq(cupons.codigo, c), eq(cupons.ativo, true)));
  if (!cupom) return { ok: false, erro: 'Cupom não encontrado.' };
  return { ok: true, codigo: c, tipo: cupom.tipo as 'percentual' | 'valor', valor: cupom.valor };
}

export async function criarPedidoAcao(entrada: unknown): Promise<ResultadoCriacao> {
  if (!(await acaoLiberadaNoPreLancamento())) return { ok: false, erros: ['Inscrições em breve.'] };
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erros: ['Sua sessão expirou. Entre de novo com seu e-mail.'] };
  try {
    return await criarPedido(usuario, entrada);
  } catch (e) {
    console.error('Falha ao criar pedido', resumoDoErro(e));
    return { ok: false, erros: ['Algo deu errado ao criar seu pedido. Tente de novo.'] };
  }
}
