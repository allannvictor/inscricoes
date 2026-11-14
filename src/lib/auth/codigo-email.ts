import 'server-only';
import { and, count, desc, eq, gt, isNull, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { codigosLogin, usuarios } from '@/db/schema';
import { enviarEmail } from '@/lib/email/enviar';
import { emailCodigo } from '@/lib/email/modelos';
import { codigoTesteAtivo } from '@/lib/ambiente';
import { codigoSeisDigitos, hmac, iguais } from './cripto';
import { hashDoIp } from './ip';
import { criarSessao } from './sessao';

/**
 * Login por código de 6 dígitos enviado ao e-mail.
 * - O código é guardado só como hash, vale 10 minutos e aceita até 5 tentativas.
 * - No máximo 5 códigos por e-mail por hora, e 20 por IP.
 * - A conta é criada no primeiro login.
 */

const VALIDADE_MS = 10 * 60 * 1000;
const MAX_TENTATIVAS = 5;
const MAX_CODIGOS_HORA = 5;
// Por IP: evita que alguém dispare códigos para muitos e-mails (spam e gasto da cota de e-mails).
const MAX_CODIGOS_HORA_IP = 20;

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

const hashCodigo = (email: string, codigo: string) => hmac(`login:${email}:${codigo}`);

export async function solicitarCodigo(emailBruto: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const email = normalizarEmail(emailBruto);
  const ipHash = await hashDoIp();
  const codigo = codigoSeisDigitos();
  const umaHora = new Date(Date.now() - 60 * 60 * 1000);

  // Contar e gravar dentro de uma transação com trava (por e-mail e por IP): pedidos simultâneos
  // não conseguem passar do limite (falha encontrada na varredura de segurança de 14/11/2026).
  const erro = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'codigo-email:' + email}))`);
    if (ipHash) await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'codigo-ip:' + ipHash}))`);
    const [{ total }] = await tx
      .select({ total: count() })
      .from(codigosLogin)
      .where(and(eq(codigosLogin.email, email), gt(codigosLogin.criadoEm, umaHora)));
    if (total >= MAX_CODIGOS_HORA) return 'Muitos códigos pedidos. Espere alguns minutos e tente de novo.';
    if (ipHash) {
      const [{ totalIp }] = await tx
        .select({ totalIp: count() })
        .from(codigosLogin)
        .where(and(eq(codigosLogin.ipHash, ipHash), gt(codigosLogin.criadoEm, umaHora)));
      if (totalIp >= MAX_CODIGOS_HORA_IP) return 'Muitos códigos pedidos a partir desta conexão. Espere alguns minutos.';
    }
    // Homologação/desenvolvimento com código fixo: não grava nem envia e-mail (testadores usam o código combinado).
    if (codigoTesteAtivo()) return null;
    await tx.insert(codigosLogin).values({ email, codigoHash: hashCodigo(email, codigo), expiraEm: new Date(Date.now() + VALIDADE_MS), ipHash });
    return null;
  });
  if (erro) return { ok: false, erro };
  // De vez em quando, apaga códigos com mais de 1 dia (já vencidos há muito tempo).
  if (Math.random() < 0.05) await db.delete(codigosLogin).where(lt(codigosLogin.criadoEm, new Date(Date.now() - 24 * 60 * 60 * 1000)));
  if (codigoTesteAtivo()) {
    console.log(`[código de teste] login solicitado para ${email}`);
    return { ok: true };
  }

  const msg = emailCodigo(codigo);
  await enviarEmail({ para: email, ...msg });
  return { ok: true };
}

/** Código fixo de teste (desenvolvimento e homologação). Nunca vale em produção: veja lib/ambiente. */
function codigoDeTeste(codigo: string): boolean {
  const fixo = codigoTesteAtivo();
  return !!fixo && iguais(codigo, fixo);
}

export async function verificarCodigo(emailBruto: string, codigoBruto: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const email = normalizarEmail(emailBruto);
  const conferido = await conferirCodigo(email, codigoBruto);
  if (!conferido.ok) return conferido;

  const [usuario] = await db
    .insert(usuarios)
    .values({ email })
    .onConflictDoUpdate({ target: usuarios.email, set: { email } })
    .returning({ id: usuarios.id });
  await criarSessao(usuario.id);
  return { ok: true };
}

/**
 * Confere (e gasta) um código enviado ao e-mail, sem abrir sessão: 5 tentativas por código, uso único.
 * Usada no login e, em Meus dados, para trocar ou remover a senha quando a pessoa esqueceu a senha atual.
 */
export async function conferirCodigo(emailBruto: string, codigoBruto: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const email = normalizarEmail(emailBruto);
  const codigo = codigoBruto.replace(/\D/g, '');
  if (codigo.length !== 6) return { ok: false, erro: 'O código tem 6 dígitos.' };

  if (!codigoDeTeste(codigo)) {
    const [ultimo] = await db
      .select()
      .from(codigosLogin)
      .where(and(eq(codigosLogin.email, email), isNull(codigosLogin.usadoEm), gt(codigosLogin.expiraEm, new Date())))
      .orderBy(desc(codigosLogin.criadoEm))
      .limit(1);
    if (!ultimo) return { ok: false, erro: 'Código expirado. Peça um novo.' };
    // Reserva a tentativa NO BANCO, de forma atômica, ANTES de conferir: com palpites simultâneos,
    // só os 5 primeiros chegam a ser conferidos (falha encontrada na varredura de segurança de 14/11/2026).
    const [reservada] = await db
      .update(codigosLogin)
      .set({ tentativas: sql`${codigosLogin.tentativas} + 1` })
      .where(and(eq(codigosLogin.id, ultimo.id), lt(codigosLogin.tentativas, MAX_TENTATIVAS), isNull(codigosLogin.usadoEm)))
      .returning({ tentativas: codigosLogin.tentativas });
    if (!reservada) return { ok: false, erro: 'Muitas tentativas. Peça um novo código.' };
    if (!iguais(ultimo.codigoHash, hashCodigo(email, codigo))) return { ok: false, erro: 'Código incorreto. Confira e tente de novo.' };
    // Cada código vale uma vez só, mesmo com duas confirmações ao mesmo tempo.
    const [usado] = await db
      .update(codigosLogin)
      .set({ usadoEm: new Date() })
      .where(and(eq(codigosLogin.id, ultimo.id), isNull(codigosLogin.usadoEm)))
      .returning({ id: codigosLogin.id });
    if (!usado) return { ok: false, erro: 'Este código já foi usado. Peça um novo.' };
  }
  return { ok: true };
}
