import 'server-only';
import { hash, verify } from '@node-rs/argon2';
import { and, count, eq, gt, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { tentativasSenha, usuarios } from '@/db/schema';
import { normalizarEmail } from './codigo-email';
import { hashDoIp } from './ip';
import { criarSessao } from './sessao';

/**
 * Login opcional com senha (etapa 6).
 * - Hash Argon2id; a senha nunca é guardada.
 * - No máximo 5 tentativas erradas a cada 15 minutos por e-mail, e 30 por IP.
 * - A mensagem de erro é a mesma para e-mail sem conta, conta sem senha e senha errada.
 * - "Esqueci a senha": entrar com o código por e-mail e criar outra em Meus dados.
 */

const MAX_ERROS = 5;
// Por IP: protege contra tentativas em massa em muitos e-mails (credential stuffing).
const MAX_ERROS_IP = 30;
const JANELA_MS = 15 * 60 * 1000;
const ERRO = 'E-mail ou senha incorretos. Se não criou uma senha, entre com o código por e-mail.';
// Hash de mentira para o tempo de resposta ser parecido quando a conta não existe ou não tem senha.
let hashFalso: Promise<string> | null = null;
const hashDeMentira = () => (hashFalso ??= hash('conta-sem-senha-' + Math.random()));

export function gerarHashSenha(senha: string): Promise<string> {
  return hash(senha);
}

export async function entrarComSenha(emailBruto: string, senha: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const email = normalizarEmail(emailBruto);
  const desde = new Date(Date.now() - JANELA_MS);
  const ipHash = await hashDoIp();

  // Conta e registra a tentativa numa transação com trava (por e-mail e por IP):
  // - tentativas simultâneas não passam do limite (só as 5 primeiras chegam a conferir a senha);
  // - tentativas JÁ bloqueadas não são gravadas, então ninguém consegue encher o banco.
  // (varreduras de segurança de 14/11/2026)
  const bloqueio = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'senha-email:' + email}))`);
    if (ipHash) await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'senha-ip:' + ipHash}))`);
    const [{ porEmail }] = await tx
      .select({ porEmail: count() })
      .from(tentativasSenha)
      .where(and(eq(tentativasSenha.email, email), gt(tentativasSenha.criadoEm, desde)));
    if (porEmail >= MAX_ERROS) return 'Muitas tentativas erradas. Espere 15 minutos ou entre com o código por e-mail.';
    if (ipHash) {
      const [{ porIp }] = await tx
        .select({ porIp: count() })
        .from(tentativasSenha)
        .where(and(eq(tentativasSenha.ipHash, ipHash), gt(tentativasSenha.criadoEm, desde)));
      if (porIp >= MAX_ERROS_IP) return 'Muitas tentativas erradas a partir desta conexão. Espere 15 minutos.';
    }
    await tx.insert(tentativasSenha).values({ email, ipHash });
    return null;
  });
  if (bloqueio) return { ok: false, erro: bloqueio };
  await limparAntigas();

  const [usuario] = await db.select({ id: usuarios.id, senhaHash: usuarios.senhaHash }).from(usuarios).where(eq(usuarios.email, email));
  const certa = await verify(usuario?.senhaHash ?? (await hashDeMentira()), senha).catch(() => false);
  if (!usuario?.senhaHash || !certa) return { ok: false, erro: ERRO }; // a tentativa já ficou registrada como erro

  // Acertou: zera as tentativas deste e-mail (inclusive a desta vez).
  await db.delete(tentativasSenha).where(eq(tentativasSenha.email, email));
  await criarSessao(usuario.id);
  return { ok: true };
}

/** De vez em quando, apaga tentativas com mais de 1 dia (não servem para nada depois da janela de 15 minutos). */
async function limparAntigas(): Promise<void> {
  if (Math.random() > 0.05) return;
  await db.delete(tentativasSenha).where(lt(tentativasSenha.criadoEm, new Date(Date.now() - 24 * 60 * 60 * 1000)));
}
