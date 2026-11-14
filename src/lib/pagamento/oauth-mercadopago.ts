/**
 * "Conectar Mercado Pago" de cada clube (OAuth, fluxo de código de autorização com PKCE).
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/security/oauth/creation
 * - O Access Token vale 180 dias e é renovado com o refresh token.
 * - A URL de retorno precisa estar cadastrada na aplicação do Mercado Pago, exatamente igual.
 */

const AUTORIZACAO = 'https://auth.mercadopago.com/authorization';
const TOKEN = 'https://api.mercadopago.com/oauth/token';

export interface CredenciaisApp {
  clientId: string;
  clientSecret: string;
}

export interface TokensClube {
  accessToken: string;
  refreshToken: string | null;
  userId: string | null;
  expiraEm: Date;
}

export function credenciaisApp(): CredenciaisApp | null {
  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function urlRetornoMercadoPago(): string {
  return `${process.env.APP_URL ?? 'http://localhost:3000'}/api/mercadopago/oauth/callback`;
}

export function urlAutorizacao(args: { clientId: string; redirectUri: string; state: string; desafio: string }): string {
  const q = new URLSearchParams({
    client_id: args.clientId,
    response_type: 'code',
    platform_id: 'mp',
    state: args.state,
    redirect_uri: args.redirectUri,
    code_challenge: args.desafio,
    code_challenge_method: 'S256',
  });
  return `${AUTORIZACAO}?${q}`;
}

function lerTokens(corpo: Record<string, unknown>, agora: Date): TokensClube {
  const accessToken = typeof corpo.access_token === 'string' ? corpo.access_token : '';
  if (!accessToken) throw new Error('O Mercado Pago não devolveu o token.');
  const segundos = typeof corpo.expires_in === 'number' ? corpo.expires_in : 180 * 24 * 60 * 60;
  return {
    accessToken,
    refreshToken: typeof corpo.refresh_token === 'string' ? corpo.refresh_token : null,
    userId: corpo.user_id != null ? String(corpo.user_id) : null,
    expiraEm: new Date(agora.getTime() + segundos * 1000),
  };
}

async function pedirToken(corpo: Record<string, string>, agora: Date): Promise<TokensClube> {
  const r = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(corpo),
    cache: 'no-store',
  });
  const json = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    console.error('Mercado Pago OAuth', r.status, json.error ?? '', json.message ?? '');
    throw new Error('O Mercado Pago recusou a conexão. Tente de novo.');
  }
  return lerTokens(json, agora);
}

export function trocarCodigo(app: CredenciaisApp, args: { code: string; verificador: string; redirectUri: string }, agora = new Date()) {
  return pedirToken(
    {
      client_id: app.clientId,
      client_secret: app.clientSecret,
      grant_type: 'authorization_code',
      code: args.code,
      redirect_uri: args.redirectUri,
      code_verifier: args.verificador,
    },
    agora,
  );
}

export function renovarToken(app: CredenciaisApp, refreshToken: string, agora = new Date()) {
  return pedirToken({ client_id: app.clientId, client_secret: app.clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken }, agora);
}

/** Renovamos quando faltam menos de 30 dias para vencer (o token vale 180). */
export function precisaRenovar(expiraEm: Date | null, agora = new Date()): boolean {
  return !!expiraEm && expiraEm.getTime() - agora.getTime() < 30 * 24 * 60 * 60 * 1000;
}
