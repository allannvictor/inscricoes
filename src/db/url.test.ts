import { afterEach, describe, expect, it, vi } from 'vitest';
import { urlDoBanco } from './url';

describe('Banco usado em cada ambiente', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('produção usa DATABASE_URL e, nas migrações, a conexão sem pooler', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('DATABASE_URL', 'postgres://prod-pooler');
    vi.stubEnv('DATABASE_URL_UNPOOLED', 'postgres://prod-direto');
    expect(urlDoBanco()).toBe('postgres://prod-pooler');
    expect(urlDoBanco({ semPooler: true })).toBe('postgres://prod-direto');
  });

  it('prévia usa só DATABASE_URL_PREVIEW', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('DATABASE_URL', 'postgres://prod');
    vi.stubEnv('DATABASE_URL_PREVIEW', 'postgres://previa');
    expect(urlDoBanco()).toBe('postgres://previa');
    expect(urlDoBanco({ semPooler: true })).toBe('postgres://previa');
  });

  it('prévia sem banco próprio falha em vez de usar produção', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('DATABASE_URL', 'postgres://prod');
    vi.stubEnv('DATABASE_URL_PREVIEW', '');
    expect(() => urlDoBanco()).toThrow(/DATABASE_URL_PREVIEW/);
  });
});
