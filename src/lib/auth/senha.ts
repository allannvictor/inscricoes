import 'server-only';
import { hash, verify } from '@node-rs/argon2';
import { and, count, eq, gt } from 'drizzle-orm';
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
  const [{ erros }] = await db
    .select({ erros: count() })
    .from(tentativasSenha)
    .where(and(eq(tentativasSenha.email, email), gt(tentativasSenha.criadoEm, desde)));
  if (erros >= MAX_ERROS) return { ok: false, erro: 'Muitas tentativas erradas. Espere 15 minutos ou entre com o código por e-mail.' };
  const ipHash = await hashDoIp();
  if (ipHash) {
    const [{ errosIp }] = await db
      .select({ errosIp: count() })
      .from(tentativasSenha)
      .where(and(eq(tentativasSenha.ipHash, ipHash), gt(tentativasSenha.criadoEm, desde)));
    if (errosIp >= MAX_ERROS_IP) return { ok: false, erro: 'Muitas tentativas erradas a partir desta conexão. Espere 15 minutos.' };
  }

  const [usuario] = await db.select({ id: usuarios.id, senhaHash: usuarios.senhaHash }).from(usuarios).where(eq(usuarios.email, email));
  const certa = await verify(usuario?.senhaHash ?? (await hashDeMentira()), senha).catch(() => false);
  if (!usuario?.senhaHash || !certa) {
    await db.insert(tentativasSenha).values({ email, ipHash });
    return { ok: false, erro: ERRO };
  }
  await db.delete(tentativasSenha).where(eq(tentativasSenha.email, email));
  await criarSessao(usuario.id);
  return { ok: true };
}
