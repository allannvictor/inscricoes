import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { pkce, tokenAleatorio } from '@/lib/auth/cripto';
import { credenciaisGoogle, urlLoginGoogle, urlRetornoGoogle } from '@/lib/auth/google';
import { destinoInterno } from '@/lib/regras/redirecionamento';

/** "Entrar com Google": guarda state + verificador PKCE num cookie de 10 minutos e manda para o Google. */
export async function GET(req: Request) {
  const voltar = destinoInterno(new URL(req.url).searchParams.get('voltar'));
  const app = credenciaisGoogle();
  const base = process.env.APP_URL ?? new URL(req.url).origin;
  if (!app) return NextResponse.redirect(`${base}/entrar?voltar=${encodeURIComponent(voltar)}`);
  const state = tokenAleatorio();
  const { verificador, desafio } = pkce();
  (await cookies()).set('google_oauth', JSON.stringify({ state, verificador, voltar }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google',
    maxAge: 10 * 60,
  });
  return NextResponse.redirect(urlLoginGoogle({ clientId: app.clientId, redirectUri: urlRetornoGoogle(), state, desafio }));
}
