'use server';

/**
 * Ações do painel do organizador. TODAS conferem a permissão no servidor
 * (verificarClube / verificarEvento) antes de ler ou gravar qualquer coisa.
 */
import { and, count, eq, inArray, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { clubes, cupons, distancias, eventos, inscricoes, organizadores, socios, usuarios } from '@/db/schema';
import { salvarArquivo } from '@/lib/arquivos';
import { verificarClube, verificarEvento } from '@/lib/painel/acesso';
import { conferirEvento, dataHoraBrasilia, eventoFormSchema, fimDoDiaBrasilia, paraCentavos, type EventoForm } from '@/lib/painel/evento-form';
import { LIMITE_TEXTO_SOCIOS, lerListaSocios } from '@/lib/painel/socios-lista';
import { limparCpf } from '@/lib/regras/cpf';
import { gerarSlug } from '@/lib/regras/slug';
import { usuarioAtual } from '@/lib/auth/sessao';
import { enviarEmail } from '@/lib/email/enviar';
import { emailConviteOrganizador } from '@/lib/email/modelos';
import { avisarMudancaContaMp } from '@/lib/pagamento/avisos';
import { podePublicarEventos } from '@/lib/pagamento/situacao';
import { normalizarCor } from '@/lib/regras/cores';
import { VALOR_CUPOM } from '@/lib/regras/cupom';
import { CONTROLE, semCaractereNulo } from '@/lib/regras/texto';
import { LIMITE_NOME_PRECO_ESPECIAL } from '@/lib/regras/preco';
import { resumoDoErro } from '@/lib/log';

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; erros: string[] };
const negado = { ok: false as const, erros: ['Você não tem acesso a isto.'] };
const atualizarPainel = () => revalidatePath('/painel', 'layout');

async function slugLivre(base: string, ignorarEventoId?: string): Promise<string> {
  const raiz = gerarSlug(base);
  for (let i = 1; i < 100; i++) {
    const candidato = i === 1 ? raiz : `${raiz}-${i}`;
    const [existe] = await db
      .select({ id: eventos.id })
      .from(eventos)
      .where(and(eq(eventos.slug, candidato), ignorarEventoId ? ne(eventos.id, ignorarEventoId) : undefined));
    if (!existe) return candidato;
  }
  return `${raiz}-${Date.now()}`;
}

// ---------------------------------------------------------------- Eventos

export async function salvarEventoAcao(clubeId: string, eventoId: string | null, dados: EventoForm): Promise<Resultado<{ eventoId: string }>> {
  const acesso = eventoId ? await verificarEvento(eventoId) : await verificarClube(clubeId);
  if (!acesso || acesso.clube.id !== clubeId) return negado;

  const parse = eventoFormSchema.safeParse(dados);
  if (!parse.success) return { ok: false, erros: [...new Set(parse.error.issues.map((i) => i.message))] };
  const e = parse.data;
  const erros = conferirEvento(e);
  if (erros.length) return { ok: false, erros };

  const campos = {
    nome: e.nome,
    dataHora: dataHoraBrasilia(e.dataHora),
    local: e.local,
    descricao: e.descricao || null,
    inscricoesAte: fimDoDiaBrasilia(e.inscricoesAte),
    transferenciaAte: e.transferenciaAte ? fimDoDiaBrasilia(e.transferenciaAte) : null,
    precoSocioAtivo: e.precoSocioAtivo,
    pedeCamisa: e.pedeCamisa,
    usaCategoria: e.usaCategoria,
  };
  const linhaDistancia = (d: (typeof e.distancias)[number], ordem: number) => ({
    nome: d.nome,
    precoCentavos: paraCentavos(d.preco),
    precoSocioCentavos: d.precoSocio === '' ? null : paraCentavos(d.precoSocio),
    vagas: d.vagas === '' ? null : Number(d.vagas),
    ordem,
  });

  try {
    const id = await db.transaction(async (tx) => {
      if (!eventoId) {
        const [novo] = await tx
          .insert(eventos)
          .values({ ...campos, clubeId, slug: await slugLivre(e.nome), status: 'rascunho' })
          .returning({ id: eventos.id });
        await tx.insert(distancias).values(e.distancias.map((d, i) => ({ ...linhaDistancia(d, i + 1), eventoId: novo.id })));
        return novo.id;
      }

      await tx.update(eventos).set(campos).where(eq(eventos.id, eventoId));
      const atuais = await tx.select({ id: distancias.id, nome: distancias.nome }).from(distancias).where(eq(distancias.eventoId, eventoId));
      const mantidas = new Set(e.distancias.map((d) => d.id).filter(Boolean));
      const removidas = atuais.filter((d) => !mantidas.has(d.id));
      for (const d of removidas) {
        const [{ total }] = await tx.select({ total: count() }).from(inscricoes).where(eq(inscricoes.distanciaId, d.id));
        if (total > 0) throw new Error(`Não dá para remover "${d.nome}": ela já tem inscrições. Você pode zerar as vagas ou encerrar o evento.`);
        await tx.delete(distancias).where(eq(distancias.id, d.id));
      }
      for (const [i, d] of e.distancias.entries()) {
        if (d.id && atuais.some((a) => a.id === d.id)) {
          await tx.update(distancias).set(linhaDistancia(d, i + 1)).where(eq(distancias.id, d.id));
        } else {
          await tx.insert(distancias).values({ ...linhaDistancia(d, i + 1), eventoId });
        }
      }
      return eventoId;
    });
    atualizarPainel();
    return { ok: true, eventoId: id };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Não dá para remover')) return { ok: false, erros: [err.message] };
    throw err;
  }
}

const statusSchema = z.enum(['rascunho', 'publicado', 'encerrado']);

export async function alterarStatusEventoAcao(eventoId: string, status: string): Promise<Resultado> {
  const acesso = await verificarEvento(eventoId);
  if (!acesso) return negado;
  const novo = statusSchema.safeParse(status);
  if (!novo.success) return { ok: false, erros: ['Status inválido.'] };
  if (novo.data === 'publicado' && !podePublicarEventos(acesso.clube)) {
    return { ok: false, erros: ['Conecte a conta Mercado Pago do clube (Painel → Pagamento) antes de publicar. Sem ela, não dá para receber as inscrições.'] };
  }
  await db.update(eventos).set({ status: novo.data }).where(eq(eventos.id, eventoId));
  atualizarPainel();
  return { ok: true };
}

export async function duplicarEventoAcao(eventoId: string): Promise<Resultado<{ eventoId: string }>> {
  const acesso = await verificarEvento(eventoId);
  if (!acesso) return negado;
  const { evento } = acesso;
  const lista = await db.select().from(distancias).where(eq(distancias.eventoId, eventoId));
  const nome = `${evento.nome} (cópia)`;
  const id = await db.transaction(async (tx) => {
    const [novo] = await tx
      .insert(eventos)
      .values({
        clubeId: evento.clubeId,
        slug: await slugLivre(nome),
        nome,
        dataHora: evento.dataHora,
        local: evento.local,
        descricao: evento.descricao,
        capaUrl: evento.capaUrl,
        regulamentoUrl: evento.regulamentoUrl,
        inscricoesAte: evento.inscricoesAte,
        transferenciaAte: evento.transferenciaAte,
        status: 'rascunho',
        precoSocioAtivo: evento.precoSocioAtivo,
        pedeCamisa: evento.pedeCamisa,
        usaCategoria: evento.usaCategoria,
      })
      .returning({ id: eventos.id });
    if (lista.length) {
      await tx.insert(distancias).values(
        lista.map((d) => ({ eventoId: novo.id, nome: d.nome, precoCentavos: d.precoCentavos, precoSocioCentavos: d.precoSocioCentavos, vagas: d.vagas, ordem: d.ordem })),
      );
    }
    return novo.id;
  });
  atualizarPainel();
  return { ok: true, eventoId: id };
}

export async function enviarArquivoEventoAcao(eventoId: string, tipo: 'capa' | 'regulamento', formulario: FormData): Promise<Resultado<{ url: string }>> {
  const acesso = await verificarEvento(eventoId);
  if (!acesso) return negado;
  const arquivo = formulario.get('arquivo');
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erros: ['Escolha um arquivo.'] };
  try {
    const url = await salvarArquivo(arquivo, tipo === 'capa' ? 'imagem' : 'pdf', `eventos/${eventoId}`);
    await db.update(eventos).set(tipo === 'capa' ? { capaUrl: url } : { regulamentoUrl: url }).where(eq(eventos.id, eventoId));
    atualizarPainel();
    return { ok: true, url };
  } catch (err) {
    return { ok: false, erros: [err instanceof Error ? err.message : 'Não foi possível enviar o arquivo.'] };
  }
}

export async function removerArquivoEventoAcao(eventoId: string, tipo: 'capa' | 'regulamento'): Promise<Resultado> {
  const acesso = await verificarEvento(eventoId);
  if (!acesso) return negado;
  await db.update(eventos).set(tipo === 'capa' ? { capaUrl: null } : { regulamentoUrl: null }).where(eq(eventos.id, eventoId));
  atualizarPainel();
  return { ok: true };
}

// ---------------------------------------------------------------- Inscritos

export async function cancelarInscricaoAcao(inscricaoId: string): Promise<Resultado> {
  if (!/^[0-9a-f-]{36}$/i.test(inscricaoId)) return negado;
  const [insc] = await db.select({ eventoId: inscricoes.eventoId, status: inscricoes.status }).from(inscricoes).where(eq(inscricoes.id, inscricaoId));
  if (!insc) return negado;
  const acesso = await verificarEvento(insc.eventoId);
  if (!acesso) return negado;
  if (!['pendente', 'confirmada'].includes(insc.status)) return { ok: false, erros: ['Esta inscrição já não está ativa.'] };
  await db
    .update(inscricoes)
    .set({ status: 'cancelada', canceladaEm: new Date(), canceladaPor: acesso.usuario.id })
    .where(eq(inscricoes.id, inscricaoId));
  atualizarPainel();
  return { ok: true };
}

// ---------------------------------------------------------------- Cupons

const cupomSchema = z.object({
  codigo: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'Código: de 3 a 30 letras, números, - ou _ (sem espaços)'),
  tipo: z.enum(['percentual', 'valor']),
  // Até R$ 9.999.999,99 ou 100%. Sem notação científica (1e10) nem hexadecimal (0x10), que davam erro 500 ou valor estranho.
  valor: z.string().trim().regex(VALOR_CUPOM, 'Informe o valor do desconto (ex.: 10 ou 10,50).'),
  limite: z.string().trim().refine((v) => v === '' || /^\d{1,6}$/.test(v), 'Limite deve ser um número (até 999.999)'),
}).superRefine(semCaractereNulo);

export async function criarCupomAcao(eventoId: string, dados: z.input<typeof cupomSchema>): Promise<Resultado> {
  const acesso = await verificarEvento(eventoId);
  if (!acesso) return negado;
  const parse = cupomSchema.safeParse(dados);
  if (!parse.success) return { ok: false, erros: [...new Set(parse.error.issues.map((i) => i.message))] };
  const c = parse.data;
  const numero = Number(c.valor.replace(',', '.'));
  if (!Number.isFinite(numero) || numero <= 0) return { ok: false, erros: ['Informe o valor do desconto.'] };
  if (c.tipo === 'percentual' && numero > 100) return { ok: false, erros: ['O desconto em % vai de 1 a 100.'] };
  const valor = c.tipo === 'percentual' ? Math.round(numero) : Math.round(numero * 100);
  try {
    await db.insert(cupons).values({ eventoId, codigo: c.codigo, tipo: c.tipo, valor, limite: c.limite === '' ? null : Number(c.limite) });
  } catch (err) {
    if (typeof err === 'object' && err && 'code' in err && err.code === '23505') return { ok: false, erros: [`Já existe o cupom ${c.codigo} neste evento.`] };
    throw err;
  }
  atualizarPainel();
  return { ok: true };
}

export async function alternarCupomAcao(cupomId: string): Promise<Resultado> {
  if (!/^[0-9a-f-]{36}$/i.test(cupomId)) return negado;
  const [cupom] = await db.select().from(cupons).where(eq(cupons.id, cupomId));
  if (!cupom || !(await verificarEvento(cupom.eventoId))) return negado;
  await db.update(cupons).set({ ativo: !cupom.ativo }).where(eq(cupons.id, cupomId));
  atualizarPainel();
  return { ok: true };
}

// ---------------------------------------------------------------- Sócios

export async function importarSociosAcao(clubeId: string, texto: string, substituir: boolean): Promise<Resultado<{ importados: number; invalidas: string[] }>> {
  const acesso = await verificarClube(clubeId);
  if (!acesso) return negado;
  if (typeof texto !== 'string' || texto.includes('\u0000')) return { ok: false, erros: ['Lista inválida: tem um caractere estranho. Copie de novo da planilha.'] };
  if (texto.length > LIMITE_TEXTO_SOCIOS) return { ok: false, erros: ['Lista grande demais: envie no máximo 5.000 pessoas por vez.'] };
  const { validos, invalidas } = lerListaSocios(texto);
  if (validos.length > 5000) return { ok: false, erros: ['Lista grande demais: envie no máximo 5.000 pessoas por vez.'] };
  if (!validos.length) return { ok: false, erros: ['Nenhum CPF válido encontrado. Cole uma pessoa por linha: CPF e nome.'] };
  await db.transaction(async (tx) => {
    if (substituir) await tx.delete(socios).where(eq(socios.clubeId, clubeId));
    await tx
      .insert(socios)
      .values(validos.map((v) => ({ clubeId, cpf: v.cpf, nome: v.nome })))
      .onConflictDoUpdate({ target: [socios.clubeId, socios.cpf], set: { nome: sql`coalesce(excluded.nome, ${socios.nome})` } });
  });
  atualizarPainel();
  return { ok: true, importados: validos.length, invalidas };
}

export async function removerSocioAcao(clubeId: string, cpf: string): Promise<Resultado> {
  const acesso = await verificarClube(clubeId);
  if (!acesso) return negado;
  if (typeof cpf !== 'string' || cpf.length > 20) return { ok: false, erros: ['CPF inválido.'] };
  await db.delete(socios).where(and(eq(socios.clubeId, clubeId), eq(socios.cpf, limparCpf(cpf))));
  atualizarPainel();
  return { ok: true };
}

// ---------------------------------------------------------------- Perfil do clube e organizadores

const perfilSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome do clube').max(120),
  whatsapp: z.string().trim().max(30),
  instagram: z.string().trim().max(60),
  email: z.union([z.literal(''), z.string().trim().max(254, 'E-mail longo demais').email('E-mail inválido')]),
  cor: z.string().trim().refine((v) => v === '' || normalizarCor(v) !== null, 'Cor inválida: use o formato #RRGGBB.'),
  nomePrecoEspecial: z.string().trim().max(LIMITE_NOME_PRECO_ESPECIAL, `O nome do preço especial pode ter até ${LIMITE_NOME_PRECO_ESPECIAL} letras.`),
}).superRefine(semCaractereNulo);

export async function salvarPerfilAcao(clubeId: string, dados: z.input<typeof perfilSchema>): Promise<Resultado> {
  const acesso = await verificarClube(clubeId);
  if (!acesso) return negado;
  const parse = perfilSchema.safeParse(dados);
  if (!parse.success) return { ok: false, erros: [...new Set(parse.error.issues.map((i) => i.message))] };
  const p = parse.data;
  const whats = p.whatsapp.replace(/\D/g, '');
  await db
    .update(clubes)
    .set({
      nome: p.nome,
      // wa.me precisa do código do país: números com DDD (10-11 dígitos) ganham 55 na frente.
      whatsapp: whats ? (whats.length <= 11 ? `55${whats}` : whats) : null,
      instagram: p.instagram ? (p.instagram.startsWith('@') ? p.instagram : `@${p.instagram}`) : null,
      email: p.email || null,
      cor: normalizarCor(p.cor),
      nomePrecoEspecial: p.nomePrecoEspecial || null,
    })
    .where(eq(clubes.id, clubeId));
  atualizarPainel();
  return { ok: true };
}

export async function enviarFotoClubeAcao(clubeId: string, formulario: FormData): Promise<Resultado<{ url: string }>> {
  const acesso = await verificarClube(clubeId);
  if (!acesso) return negado;
  const arquivo = formulario.get('arquivo');
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erros: ['Escolha uma imagem.'] };
  try {
    const url = await salvarArquivo(arquivo, 'imagem', `clubes/${clubeId}`);
    await db.update(clubes).set({ fotoUrl: url }).where(eq(clubes.id, clubeId));
    atualizarPainel();
    return { ok: true, url };
  } catch (err) {
    return { ok: false, erros: [err instanceof Error ? err.message : 'Não foi possível enviar a imagem.'] };
  }
}

export async function adicionarOrganizadorAcao(clubeId: string, emailBruto: string): Promise<Resultado> {
  const acesso = await verificarClube(clubeId);
  if (!acesso) return negado;
  const email = typeof emailBruto === 'string' ? emailBruto.trim().toLowerCase() : '';
  if (email.length > 254 || CONTROLE.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erros: ['Digite um e-mail válido.'] };
  await convidarOrganizador(acesso.clube, email);
  atualizarPainel();
  return { ok: true };
}

/** Adiciona o e-mail como organizador do clube e manda o convite (se ainda não era organizador). */
async function convidarOrganizador(clube: { id: string; nome: string; slug: string }, email: string): Promise<void> {
  const [usuario] = await db.insert(usuarios).values({ email }).onConflictDoUpdate({ target: usuarios.email, set: { email } }).returning({ id: usuarios.id });
  const novo = await db.insert(organizadores).values({ clubeId: clube.id, usuarioId: usuario.id }).onConflictDoNothing().returning();
  if (novo.length) {
    const link = `${process.env.APP_URL ?? ''}/entrar?voltar=${encodeURIComponent(`/painel/c/${clube.slug}`)}`;
    await enviarEmail({ para: email, ...emailConviteOrganizador({ clube: clube.nome, link }) }).catch((e) => console.error('Convite de organizador não enviado', resumoDoErro(e)));
  }
}

// ---------------------------------------------------------------- Clubes (só o master)

const RESERVADOS = new Set(['novo', 'clubes', 'admin', 'painel', 'api']);

const novoClubeSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome do clube').max(120),
  slug: z.string().trim().max(60),
  emailOrganizador: z.string().trim().toLowerCase().max(254, 'E-mail longo demais').email('Informe o e-mail do organizador'),
  cor: z.string().trim().refine((v) => v === '' || normalizarCor(v) !== null, 'Cor inválida: use o formato #RRGGBB.'),
  nomePrecoEspecial: z.string().trim().max(LIMITE_NOME_PRECO_ESPECIAL, `O nome do preço especial pode ter até ${LIMITE_NOME_PRECO_ESPECIAL} letras.`),
}).superRefine(semCaractereNulo);

export async function criarClubeAcao(dados: z.input<typeof novoClubeSchema>): Promise<Resultado<{ slug: string }>> {
  const usuario = await usuarioAtual();
  if (!usuario?.admin) return negado;
  const parse = novoClubeSchema.safeParse(dados);
  if (!parse.success) return { ok: false, erros: [...new Set(parse.error.issues.map((i) => i.message))] };
  const d = parse.data;
  const slug = gerarSlug(d.slug || d.nome);
  // O endereço do clube que usa a conta do site (MP_CLUBE_DO_TOKEN) é reservado: um clube novo nunca herda essa conta.
  if (RESERVADOS.has(slug) || slug === (process.env.MP_CLUBE_DO_TOKEN || 'cf-assessoria')) return { ok: false, erros: ['Escolha outro endereço para o clube.'] };
  const [existe] = await db.select({ id: clubes.id }).from(clubes).where(eq(clubes.slug, slug));
  if (existe) return { ok: false, erros: [`Já existe um clube com o endereço "${slug}". Escolha outro.`] };
  const [clube] = await db
    .insert(clubes)
    .values({ nome: d.nome, slug, cor: normalizarCor(d.cor), nomePrecoEspecial: d.nomePrecoEspecial || null })
    .returning();
  await convidarOrganizador(clube, d.emailOrganizador);
  atualizarPainel();
  return { ok: true, slug };
}

export async function removerOrganizadorAcao(clubeId: string, usuarioId: string): Promise<Resultado> {
  const acesso = await verificarClube(clubeId);
  if (!acesso) return negado;
  if (!/^[0-9a-f-]{36}$/i.test(usuarioId)) return negado;
  const lista = await db.select({ id: organizadores.usuarioId }).from(organizadores).where(eq(organizadores.clubeId, clubeId));
  if (lista.length <= 1 && lista.some((o) => o.id === usuarioId)) return { ok: false, erros: ['O clube precisa ter pelo menos um organizador.'] };
  await db.delete(organizadores).where(and(eq(organizadores.clubeId, clubeId), inArray(organizadores.usuarioId, [usuarioId])));
  atualizarPainel();
  return { ok: true };
}

// ---------------------------------------------------------------- Mercado Pago do clube

export async function desconectarMercadoPagoAcao(clubeId: string): Promise<Resultado> {
  const acesso = await verificarClube(clubeId);
  if (!acesso) return negado;
  await db
    .update(clubes)
    .set({ mpAccessToken: null, mpRefreshToken: null, mpUserId: null, mpTokenExpiraEm: null, mpConectado: false, mpConectadoEm: null })
    .where(eq(clubes.id, clubeId));
  if (acesso.clube.mpConectado) await avisarMudancaContaMp({ clube: acesso.clube, acao: 'desconectada', porEmail: acesso.usuario.email });
  atualizarPainel();
  return { ok: true };
}
