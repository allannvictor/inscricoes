import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { clubes } from '@/db/schema';
import { pkce, tokenAleatorio } from '@/lib/auth/cripto';
import { verificarClube } from '@/lib/painel/acesso';
import { credenciaisApp, urlAutorizacao, urlRetornoMercadoPago } from '@/lib/pagamento/oauth-mercadopago';

// Cookie temporário (10 min) com o state e o verificador PKCE; lido em /api/mercadopago/oauth/callback.
const COOKIE_OAUTH_MP = 'mp_oauth';

/** "Conectar Mercado Pago": leva o organizador para autorizar o site na conta do clube. */
export async function GET(_: Request, { params }: { params: Promise<{ clube: string }> }) {
  const { clube: slug } = await params;
  const [clube] = await db.select({ id: clubes.id }).from(clubes).where(eq(clubes.slug, slug));
  if (!clube || !(await verificarClube(clube.id))) return new NextResponse('Não encontrado', { status: 404 });
  const app = credenciaisApp();
  const voltar = `${process.env.APP_URL ?? ''}/painel/c/${slug}/pagamento`;
  if (!app) return NextResponse.redirect(`${voltar}?erro=sem-app`);

  const state = tokenAleatorio();
  const { verificador, desafio } = pkce();
  (await cookies()).set(COOKIE_OAUTH_MP, JSON.stringify({ state, verificador, clubeId: clube.id, slug }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/mercadopago/oauth',
    maxAge: 10 * 60,
  });
  return NextResponse.redirect(urlAutorizacao({ clientId: app.clientId, redirectUri: urlRetornoMercadoPago(), state, desafio }));
}
