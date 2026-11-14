import 'server-only';
import { and, count, desc, eq, gt, isNull } from 'drizzle-orm';
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
  const [{ total }] = await db
    .select({ total: count() })
    .from(codigosLogin)
    .where(and(eq(codigosLogin.email, email), gt(codigosLogin.criadoEm, new Date(Date.now() - 60 * 60 * 1000))));
  if (total >= MAX_CODIGOS_HORA) return { ok: false, erro: 'Muitos códigos pedidos. Espere alguns minutos e tente de novo.' };
  const ipHash = await hashDoIp();
  if (ipHash) {
    const [{ totalIp }] = await db
      .select({ totalIp: count() })
      .from(codigosLogin)
      .where(and(eq(codigosLogin.ipHash, ipHash), gt(codigosLogin.criadoEm, new Date(Date.now() - 60 * 60 * 1000))));
    if (totalIp >= MAX_CODIGOS_HORA_IP) return { ok: false, erro: 'Muitos códigos pedidos a partir desta conexão. Espere alguns minutos.' };
  }

  // Homologação/desenvolvimento com código fixo: não envia e-mail (testadores usam o código combinado).
  if (codigoTesteAtivo()) {
    console.log(`[código de teste] login solicitado para ${email}`);
    return { ok: true };
  }

  const codigo = codigoSeisDigitos();
  await db.insert(codigosLogin).values({ email, codigoHash: hashCodigo(email, codigo), expiraEm: new Date(Date.now() + VALIDADE_MS), ipHash });
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
    if (ultimo.tentativas >= MAX_TENTATIVAS) return { ok: false, erro: 'Muitas tentativas. Peça um novo código.' };
    if (!iguais(ultimo.codigoHash, hashCodigo(email, codigo))) {
      await db.update(codigosLogin).set({ tentativas: ultimo.tentativas + 1 }).where(eq(codigosLogin.id, ultimo.id));
      return { ok: false, erro: 'Código incorreto. Confira e tente de novo.' };
    }
    await db.update(codigosLogin).set({ usadoEm: new Date() }).where(eq(codigosLogin.id, ultimo.id));
  }

  const [usuario] = await db
    .insert(usuarios)
    .values({ email })
    .onConflictDoUpdate({ target: usuarios.email, set: { email } })
    .returning({ id: usuarios.id });
  await criarSessao(usuario.id);
  return { ok: true };
}
