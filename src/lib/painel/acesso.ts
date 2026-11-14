import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { clubes, eventos, type Clube, type Evento } from '@/db/schema';
import { ehOrganizadorDoClube, podeAbrirPainel } from '@/lib/auth/permissoes';
import { paraPermissao, usuarioAtual, type UsuarioAtual } from '@/lib/auth/sessao';
import { ehUuid } from '@/lib/regras/uuid';
import { ehSlug } from '@/lib/regras/slug';

/**
 * Guardas do painel. Toda página e toda ação do painel passa por aqui.
 * Quem não tem acesso vê "não encontrado" (não dizemos que o painel existe).
 */

export async function exigirPainel(voltar = '/painel'): Promise<UsuarioAtual> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect(`/entrar?voltar=${encodeURIComponent(voltar)}`);
  if (!podeAbrirPainel(paraPermissao(usuario))) notFound();
  return usuario;
}

/** Clubes que o usuário pode gerir (master: todos). */
export async function clubesDoUsuario(usuario: UsuarioAtual): Promise<Clube[]> {
  const todos = await db.select().from(clubes).orderBy(asc(clubes.nome));
  return usuario.admin ? todos : todos.filter((c) => usuario.clubesOrganizados.includes(c.id));
}

/** Para páginas: usuário + clube, ou 404. */
export async function exigirClube(slug: string): Promise<{ usuario: UsuarioAtual; clube: Clube }> {
  if (!ehSlug(slug)) notFound();
  const usuario = await exigirPainel(`/painel/c/${slug}`);
  const [clube] = await db.select().from(clubes).where(eq(clubes.slug, slug));
  if (!clube || !ehOrganizadorDoClube(paraPermissao(usuario), clube.id)) notFound();
  return { usuario, clube };
}

/** Para páginas: evento que pertence ao clube, ou 404. */
export async function exigirEvento(slugClube: string, eventoId: string): Promise<{ usuario: UsuarioAtual; clube: Clube; evento: Evento }> {
  const { usuario, clube } = await exigirClube(slugClube);
  if (!ehUuid(eventoId)) notFound();
  const [evento] = await db.select().from(eventos).where(and(eq(eventos.id, eventoId), eq(eventos.clubeId, clube.id)));
  if (!evento) notFound();
  return { usuario, clube, evento };
}

/** Para ações (Server Actions): devolve null em vez de redirecionar. */
export async function verificarClube(clubeId: string): Promise<{ usuario: UsuarioAtual; clube: Clube } | null> {
  const usuario = await usuarioAtual();
  if (!usuario || !ehUuid(clubeId)) return null;
  const [clube] = await db.select().from(clubes).where(eq(clubes.id, clubeId));
  if (!clube || !ehOrganizadorDoClube(paraPermissao(usuario), clube.id)) return null;
  return { usuario, clube };
}

export async function verificarEvento(eventoId: string): Promise<{ usuario: UsuarioAtual; clube: Clube; evento: Evento } | null> {
  if (!ehUuid(eventoId)) return null;
  const [evento] = await db.select().from(eventos).where(eq(eventos.id, eventoId));
  if (!evento) return null;
  const ok = await verificarClube(evento.clubeId);
  return ok ? { ...ok, evento } : null;
}
