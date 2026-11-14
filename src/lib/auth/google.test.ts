import { afterEach, describe, expect, it, vi } from 'vitest';
import { lerIdToken, trocarCodigoGoogle, urlLoginGoogle } from './google';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (p: object) => `${b64({ alg: 'RS256' })}.${b64(p)}.assinatura`;
const agora = new Date('2026-11-14T12:00:00Z');
const valido = { iss: 'https://accounts.google.com', aud: 'cliente-123', sub: 'g-1', email: 'Ana@Gmail.com', email_verified: true, name: 'Ana Atleta', exp: agora.getTime() / 1000 + 600 };

afterEach(() => vi.unstubAllGlobals());

describe('Entrar com Google', () => {
  it('monta a URL com PKCE, state e escopos', () => {
    const u = new URL(urlLoginGoogle({ clientId: 'cliente-123', redirectUri: 'https://hml.x/api/auth/google/callback', state: 's', desafio: 'd' }));
    expect(u.host).toBe('accounts.google.com');
    expect(u.searchParams.get('scope')).toBe('openid email profile');
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('state')).toBe('s');
  });

  it('lê o id_token e normaliza o e-mail', () => {
    expect(lerIdToken(token(valido), 'cliente-123', agora)).toEqual({ sub: 'g-1', email: 'ana@gmail.com', emailVerificado: true, nome: 'Ana Atleta' });
  });

  it('recusa token de outro aplicativo, de outro emissor ou vencido', () => {
    expect(() => lerIdToken(token({ ...valido, aud: 'outro' }), 'cliente-123', agora)).toThrow('Destinatário');
    expect(() => lerIdToken(token({ ...valido, iss: 'https://malicioso.com' }), 'cliente-123', agora)).toThrow('Emissor');
    expect(() => lerIdToken(token({ ...valido, exp: agora.getTime() / 1000 - 1 }), 'cliente-123', agora)).toThrow('vencido');
  });

  it('troca o código no endpoint de token do Google', async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id_token: token({ ...valido, exp: Date.now() / 1000 + 600 }) }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    const conta = await trocarCodigoGoogle({ clientId: 'cliente-123', clientSecret: 's' }, { code: 'c', verificador: 'v', redirectUri: 'https://r' });
    expect(conta.email).toBe('ana@gmail.com');
    const corpo = new URLSearchParams(f.mock.calls[0][1].body.toString());
    expect(corpo.get('code_verifier')).toBe('v');
    expect(corpo.get('grant_type')).toBe('authorization_code');
  });
});
