import { describe, expect, it } from 'vitest';
import { podePublicarEventos, situacaoDoPagamento } from './situacao';

const cf = { slug: 'cf-assessoria', mpAccessToken: null, mpConectado: false };
const outro = { slug: 'outro-clube', mpAccessToken: null, mpConectado: false };
const prod = (extra: Record<string, string> = {}) => ({ NODE_ENV: 'production', VERCEL_ENV: 'production', ...extra }) as NodeJS.ProcessEnv;
const hml = (extra: Record<string, string> = {}) => ({ NODE_ENV: 'production', VERCEL_ENV: 'preview', PERMITIR_SIMULADO: '1', ...extra }) as NodeJS.ProcessEnv;

describe('situacaoDoPagamento', () => {
  it('o token do site vale só para o clube indicado (padrão: CF)', () => {
    const env = prod({ MP_ACCESS_TOKEN: 'APP_USR-cf' });
    expect(situacaoDoPagamento(cf, env)).toBe('ambiente');
    expect(situacaoDoPagamento(outro, env)).toBe('nao-configurado'); // nunca cai na conta da CF
    expect(situacaoDoPagamento(outro, prod({ MP_ACCESS_TOKEN: 'x', MP_CLUBE_DO_TOKEN: 'outro-clube' }))).toBe('ambiente');
  });
  it('conta conectada pelo clube tem prioridade', () => {
    const conectado = { ...outro, mpAccessToken: 'v1.cifrado', mpConectado: true };
    expect(situacaoDoPagamento(conectado, prod({ MP_ACCESS_TOKEN: 'x' }))).toBe('conectado');
    expect(situacaoDoPagamento({ ...cf, mpAccessToken: 'v1.c', mpConectado: true }, prod({ MP_ACCESS_TOKEN: 'x' }))).toBe('conectado');
  });
  it('sem conta: simulado só fora de produção ou com PERMITIR_SIMULADO', () => {
    expect(situacaoDoPagamento(outro, hml())).toBe('simulado');
    expect(situacaoDoPagamento(outro, { NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBe('simulado');
    expect(situacaoDoPagamento(outro, prod())).toBe('nao-configurado');
  });
});

describe('podePublicarEventos', () => {
  it('em produção, só com conta de verdade, mesmo com PERMITIR_SIMULADO', () => {
    expect(podePublicarEventos(outro, prod({ PERMITIR_SIMULADO: '1' }))).toBe(false);
    expect(podePublicarEventos(cf, prod({ MP_ACCESS_TOKEN: 'x' }))).toBe(true);
    expect(podePublicarEventos({ ...outro, mpAccessToken: 'v1.c', mpConectado: true }, prod())).toBe(true);
  });
  it('na homologação, o Pix simulado vale', () => {
    expect(podePublicarEventos(outro, hml())).toBe(true);
  });
});
