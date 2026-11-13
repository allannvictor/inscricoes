import { afterEach, describe, expect, it, vi } from 'vitest';
import { codigoTesteAtivo, ehHomologacao } from './ambiente';

describe('Código fixo de teste', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('vale na homologação', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('LOGIN_CODIGO_TESTE', '123456');
    expect(codigoTesteAtivo()).toBe('123456');
    expect(ehHomologacao()).toBe(true);
  });

  it('nunca vale em produção, mesmo configurado', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('LOGIN_CODIGO_TESTE', '123456');
    expect(codigoTesteAtivo()).toBeNull();
  });

  it('produção fora da Vercel também ignora', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('LOGIN_CODIGO_TESTE', '123456');
    expect(codigoTesteAtivo()).toBeNull();
  });

  it('vale em desenvolvimento; código inválido é ignorado', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('LOGIN_CODIGO_TESTE', '123456');
    expect(codigoTesteAtivo()).toBe('123456');
    vi.stubEnv('LOGIN_CODIGO_TESTE', '12');
    expect(codigoTesteAtivo()).toBeNull();
  });
});
