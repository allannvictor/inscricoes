import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { clubes } from '@/db/schema';
import { cifrar, iguais } from '@/lib/auth/cripto';
import { verificarClube } from '@/lib/painel/acesso';
import { avisarMudancaContaMp } from '@/lib/pagamento/avisos';
import { credenciaisApp, trocarCodigo, urlRetornoMercadoPago } from '@/lib/pagamento/oauth-mercadopago';

const COOKIE_OAUTH_MP = 'mp_oauth';

/** Volta do Mercado Pago: confere o state, troca o código pelo token e guarda criptografado no clube. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const bruto = jar.get(COOKIE_OAUTH_MP)?.value;
  jar.delete({ name: COOKIE_OAUTH_MP, path: '/api/mercadopago/oauth' });
  const base = process.env.APP_URL ?? url.origin;

  let salvo: { state: string; verificador: string; clubeId: string; slug: string } | null = null;
  try {
    salvo = bruto ? JSON.parse(bruto) : null;
  } catch {
    salvo = null;
  }
  if (!salvo) return NextResponse.redirect(`${base}/painel?erro=mp-expirou`);
  const voltar = `${base}/painel/c/${salvo.slug}/pagamento`;

  const state = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code');
  if (!code || !iguais(state, salvo.state)) return NextResponse.redirect(`${voltar}?erro=recusado`);
  const acesso = await verificarClube(salvo.clubeId);
  if (!acesso) return new NextResponse('Não encontrado', { status: 404 });
  const app = credenciaisApp();
  if (!app) return NextResponse.redirect(`${voltar}?erro=sem-app`);

  let novoUsuarioMp: string | null = null;
  try {
    const t = await trocarCodigo(app, { code, verificador: salvo.verificador, redirectUri: urlRetornoMercadoPago() });
    novoUsuarioMp = t.userId;
    await db
      .update(clubes)
      .set({
        mpAccessToken: cifrar(t.accessToken),
        mpRefreshToken: t.refreshToken ? cifrar(t.refreshToken) : null,
        mpUserId: t.userId,
        mpTokenExpiraEm: t.expiraEm,
        mpConectado: true,
        mpConectadoEm: new Date(),
      })
      .where(eq(clubes.id, salvo.clubeId));
  } catch (e) {
    console.error('Mercado Pago OAuth: falha ao conectar', e);
    return NextResponse.redirect(`${voltar}?erro=falhou`);
  }
  await avisarMudancaContaMp({
    clube: acesso.clube,
    acao: acesso.clube.mpConectado ? 'trocada' : 'conectada',
    porEmail: acesso.usuario.email,
    contaId: novoUsuarioMp,
  });
  return NextResponse.redirect(`${voltar}?conectado=1`);
}
