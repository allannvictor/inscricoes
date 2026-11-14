import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { usuarios } from '@/db/schema';
import type { ContaGoogle } from './google';
import { enviarEmail } from '@/lib/email/enviar';
import { emailAvisoSeguranca } from '@/lib/email/modelos';
import { criarSessao } from './sessao';

/**
 * Liga a conta Google à conta do site e abre a sessão.
 * - Já ligada (mesmo "sub"): entra.
 * - Senão, pelo e-mail VERIFICADO no Google: entra na conta que já existe com esse e-mail e liga o Google.
 * - Senão, cria a conta (como no primeiro código por e-mail).
 */
export async function entrarComGoogle(conta: ContaGoogle): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!conta.emailVerificado) return { ok: false, erro: 'O e-mail desta conta Google não está verificado. Entre com o código por e-mail.' };

  const [ligado] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.googleId, conta.sub));
  if (ligado) {
    await criarSessao(ligado.id);
    return { ok: true };
  }

  const [porEmail] = await db.select({ id: usuarios.id, nome: usuarios.nome }).from(usuarios).where(eq(usuarios.email, conta.email));
  if (porEmail) {
    await db.update(usuarios).set({ googleId: conta.sub }).where(eq(usuarios.id, porEmail.id));
    const aviso = emailAvisoSeguranca({
      assunto: 'Conta Google ligada à sua conta',
      titulo: 'Conta Google ligada',
      linhas: [`A conta Google ${conta.email} foi usada para entrar e agora está ligada à sua conta no Inscrições Fast.`],
      seNaoFoiVoce: 'Alguém pode ter acesso à sua conta Google. Troque a senha do Google e fale com a organização.',
    });
    await enviarEmail({ para: conta.email, ...aviso }).catch((e) => console.error('Aviso de Google não enviado', e));
    if (!porEmail.nome && conta.nome) await db.update(usuarios).set({ nome: conta.nome }).where(eq(usuarios.id, porEmail.id));
    await criarSessao(porEmail.id);
    return { ok: true };
  }

  const [novo] = await db.insert(usuarios).values({ email: conta.email, nome: conta.nome, googleId: conta.sub }).returning({ id: usuarios.id });
  await criarSessao(novo.id);
  return { ok: true };
}

