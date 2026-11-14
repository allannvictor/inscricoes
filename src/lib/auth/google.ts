/**
 * "Entrar com Google" (OpenID Connect, fluxo de código de autorização com PKCE).
 * Precisa de GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET (cliente OAuth "Aplicativo da Web" no Google Cloud),
 * com a URL de retorno {APP_URL}/api/auth/google/callback cadastrada.
 *
 * O id_token vem direto do Google (pela conexão HTTPS com o endpoint de token), então conferimos
 * emissor, destinatário e validade sem precisar checar a assinatura (OpenID Connect, seção 3.1.3.7).
 */

const AUTORIZACAO = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';

export interface ContaGoogle {
  sub: string;
  email: string;
  emailVerificado: boolean;
  nome: string | null;
}

export function credenciaisGoogle(env: NodeJS.ProcessEnv = process.env): { clientId: string; clientSecret: string } | null {
  return env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } : null;
}

export function googleAtivo(): boolean {
  return !!credenciaisGoogle();
}

export function urlRetornoGoogle(): string {
  return `${process.env.APP_URL ?? 'http://localhost:3000'}/api/auth/google/callback`;
}

export function urlLoginGoogle(args: { clientId: string; redirectUri: string; state: string; desafio: string }): string {
  const q = new URLSearchParams({
    client_id: args.clientId,
    redirect_uri: args.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: args.state,
    code_challenge: args.desafio,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return `${AUTORIZACAO}?${q}`;
}

/** Lê e confere o id_token devolvido pelo endpoint de token do Google. */
export function lerIdToken(idToken: string, clientId: string, agora = new Date()): ContaGoogle {
  const partes = idToken.split('.');
  if (partes.length !== 3) throw new Error('id_token inválido');
  const p = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8')) as Record<string, unknown>;
  if (p.iss !== 'https://accounts.google.com' && p.iss !== 'accounts.google.com') throw new Error('Emissor inesperado');
  const aud = Array.isArray(p.aud) ? p.aud : [p.aud];
  if (!aud.includes(clientId)) throw new Error('Destinatário inesperado');
  if (typeof p.exp !== 'number' || p.exp * 1000 < agora.getTime()) throw new Error('id_token vencido');
  if (typeof p.sub !== 'string' || typeof p.email !== 'string') throw new Error('id_token sem e-mail');
  return {
    sub: p.sub,
    email: p.email.trim().toLowerCase(),
    emailVerificado: p.email_verified === true || p.email_verified === 'true',
    nome: typeof p.name === 'string' && p.name.trim() ? p.name.trim() : null,
  };
}

export async function trocarCodigoGoogle(
  app: { clientId: string; clientSecret: string },
  args: { code: string; verificador: string; redirectUri: string },
): Promise<ContaGoogle> {
  const r = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: args.code,
      client_id: app.clientId,
      client_secret: app.clientSecret,
      redirect_uri: args.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: args.verificador,
    }),
    cache: 'no-store',
  });
  const json = (await r.json().catch(() => ({}))) as { id_token?: string; error?: string };
  if (!r.ok || !json.id_token) {
    console.error('Google OAuth', r.status, json.error ?? '');
    throw new Error('O Google não confirmou o login.');
  }
  return lerIdToken(json.id_token, app.clientId);
}
