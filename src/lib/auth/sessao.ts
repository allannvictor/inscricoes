import 'server-only';
import { cookies } from 'next/headers';
import { and, eq, gt, ne } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/db';
import { organizadores, sessoes, usuarios, type Usuario } from '@/db/schema';
import { hmac, tokenAleatorio } from './cripto';
import { ehEmailAdmin, type UsuarioLogado } from './permissoes';

const COOKIE = 'sessao';
const DURACAO_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export async function criarSessao(usuarioId: string): Promise<void> {
  const token = tokenAleatorio();
  const expiraEm = new Date(Date.now() + DURACAO_MS);
  await db.insert(sessoes).values({ tokenHash: hmac(token), usuarioId, expiraEm });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiraEm,
  });
}

/** Encerra todas as outras sessões do usuário (outros aparelhos), mantendo a atual. Usado ao mudar a senha. */
export async function encerrarOutrasSessoes(usuarioId: string): Promise<void> {
  const token = (await cookies()).get(COOKIE)?.value;
  await db
    .delete(sessoes)
    .where(token ? and(eq(sessoes.usuarioId, usuarioId), ne(sessoes.tokenHash, hmac(token))) : eq(sessoes.usuarioId, usuarioId));
}

export async function encerrarSessao(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessoes).where(eq(sessoes.tokenHash, hmac(token)));
  jar.delete(COOKIE);
}

export type UsuarioAtual = Usuario & { clubesOrganizados: string[]; admin: boolean };

/** Usuário logado (ou null). Cacheado por requisição. */
export const usuarioAtual = cache(async (): Promise<UsuarioAtual | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [linha] = await db
    .select({ usuario: usuarios })
    .from(sessoes)
    .innerJoin(usuarios, eq(usuarios.id, sessoes.usuarioId))
    .where(and(eq(sessoes.tokenHash, hmac(token)), gt(sessoes.expiraEm, new Date())))
    .limit(1);
  if (!linha) return null;
  const clubes = await db.select({ clubeId: organizadores.clubeId }).from(organizadores).where(eq(organizadores.usuarioId, linha.usuario.id));
  return { ...linha.usuario, clubesOrganizados: clubes.map((c) => c.clubeId), admin: ehEmailAdmin(linha.usuario.email, process.env.ADMIN_EMAILS) };
});

export function paraPermissao(u: UsuarioAtual | null): UsuarioLogado | null {
  return u ? { id: u.id, email: u.email, cpf: u.cpf, clubesOrganizados: u.clubesOrganizados, admin: u.admin } : null;
}
