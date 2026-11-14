/**
 * "Conectar Mercado Pago" de cada clube (OAuth, fluxo de código de autorização com PKCE).
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/security/oauth/creation
 * - O Access Token vale 180 dias e é renovado com o refresh token.
 * - A URL de retorno precisa estar cadastrada na aplicação do Mercado Pago, exatamente igual.
 */

import { resumoErroMercadoPago } from './erro-mercadopago';

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
    console.error('Mercado Pago OAuth', resumoErroMercadoPago(r.status, json));
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

/**
 * Quem é a conta conectada, para o organizador saber em qual conta o Pix cai (pedido do Allan, 14/11/2026).
 * Só dados de identificação: nome, apelido e o e-mail MASCARADO. Nada de documento, saldo ou telefone.
 */
export interface ContaMp {
  nome: string | null;
  apelido: string | null;
  emailMascarado: string | null;
}

/** "allan.santos@gmail.com" → "al***@gmail.com". */
export function mascararEmail(email: string): string | null {
  const m = /^([^\s@]+)@([^\s@]+\.[^\s@]+)$/.exec(email.trim());
  if (!m) return null;
  return `${m[1].slice(0, 2)}***@${m[2]}`;
}

const curto = (v: unknown, max = 80): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  return t || null;
};

/** Lê a resposta de GET /users/me. */
export function lerContaMp(json: unknown): ContaMp {
  const c = json && typeof json === 'object' ? (json as Record<string, unknown>) : {};
  const nome = curto([curto(c.first_name), curto(c.last_name)].filter(Boolean).join(' '));
  const email = typeof c.email === 'string' ? mascararEmail(c.email) : null;
  return { nome, apelido: curto(c.nickname, 60), emailMascarado: email ? email.slice(0, 120) : null };
}

/** Busca a conta dona do token. Falha devolve null (é só informativo; nunca impede a conexão). */
export async function buscarContaMp(accessToken: string): Promise<ContaMp | null> {
  try {
    const r = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}`, accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('Mercado Pago (conta)', resumoErroMercadoPago(r.status, json));
      return null;
    }
    return lerContaMp(json);
  } catch {
    return null;
  }
}
