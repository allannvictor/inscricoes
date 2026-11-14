import { afterEach, describe, expect, it, vi } from 'vitest';
import { precisaRenovar, renovarToken, trocarCodigo, urlAutorizacao } from './oauth-mercadopago';

const app = { clientId: '123', clientSecret: 'segredo' };
afterEach(() => vi.unstubAllGlobals());

describe('OAuth do Mercado Pago', () => {
  it('monta a URL de autorização com PKCE e state', () => {
    const u = new URL(urlAutorizacao({ clientId: '123', redirectUri: 'https://hml.x/api/mercadopago/oauth/callback', state: 'abc', desafio: 'xyz' }));
    expect(u.origin + u.pathname).toBe('https://auth.mercadopago.com/authorization');
    expect(Object.fromEntries(u.searchParams)).toEqual({
      client_id: '123',
      response_type: 'code',
      platform_id: 'mp',
      state: 'abc',
      redirect_uri: 'https://hml.x/api/mercadopago/oauth/callback',
      code_challenge: 'xyz',
      code_challenge_method: 'S256',
    });
  });

  it('troca o código pelo token e calcula a validade', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'APP_USR-novo', refresh_token: 'TG-r', user_id: 999, expires_in: 15552000 }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchFalso);
    const agora = new Date('2026-11-14T12:00:00Z');
    const t = await trocarCodigo(app, { code: 'TG-c', verificador: 'v', redirectUri: 'https://r' }, agora);
    expect(t).toEqual({ accessToken: 'APP_USR-novo', refreshToken: 'TG-r', userId: '999', expiraEm: new Date('2027-05-13T12:00:00Z') });
    const corpo = JSON.parse(fetchFalso.mock.calls[0][1].body);
    expect(corpo).toMatchObject({ grant_type: 'authorization_code', code: 'TG-c', code_verifier: 'v', client_secret: 'segredo' });
  });

  it('erro do Mercado Pago vira mensagem amigável', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renovarToken(app, 'TG-r')).rejects.toThrow('O Mercado Pago recusou a conexão');
  });

  it('renova quando faltam menos de 30 dias', () => {
    const agora = new Date('2026-11-14T00:00:00Z');
    expect(precisaRenovar(new Date('2026-12-01T00:00:00Z'), agora)).toBe(true);
    expect(precisaRenovar(new Date('2027-03-01T00:00:00Z'), agora)).toBe(false);
    expect(precisaRenovar(null, agora)).toBe(false);
  });
});
