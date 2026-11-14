import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { iguais } from '@/lib/auth/cripto';
import { credenciaisGoogle, trocarCodigoGoogle, urlRetornoGoogle } from '@/lib/auth/google';
import { entrarComGoogle } from '@/lib/auth/google-login';
import { destinoInterno } from '@/lib/regras/redirecionamento';
import { resumoDoErro } from '@/lib/log';

/** Volta do Google: confere o state, troca o código e entra (ou cria a conta). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = process.env.APP_URL ?? url.origin;
  const jar = await cookies();
  const bruto = jar.get('google_oauth')?.value;
  jar.delete({ name: 'google_oauth', path: '/api/auth/google' });

  let salvo: { state: string; verificador: string; voltar: string } | null = null;
  try {
    salvo = bruto ? JSON.parse(bruto) : null;
  } catch {
    salvo = null;
  }
  const voltar = destinoInterno(salvo?.voltar);
  const falhou = (motivo: string) => NextResponse.redirect(`${base}/entrar?erro=${motivo}&voltar=${encodeURIComponent(voltar)}`);

  const code = url.searchParams.get('code');
  const app = credenciaisGoogle();
  if (!salvo || !code || !app || !iguais(url.searchParams.get('state') ?? '', salvo.state)) return falhou('google');

  try {
    const conta = await trocarCodigoGoogle(app, { code, verificador: salvo.verificador, redirectUri: urlRetornoGoogle() });
    const r = await entrarComGoogle(conta);
    if (!r.ok) return falhou('google-email');
  } catch (e) {
    console.error('Entrar com Google: falhou', resumoDoErro(e));
    return falhou('google');
  }
  return NextResponse.redirect(`${base}${voltar}`);
}
