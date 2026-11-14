import { describe, expect, it } from 'vitest';
import { podePublicarEventos, podeSimularPagamento, simuladoPermitido, situacaoDoPagamento } from './situacao';

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
  it('em produção, nunca simulado, nem com PERMITIR_SIMULADO (evita inscrição de graça)', () => {
    expect(situacaoDoPagamento(outro, prod({ PERMITIR_SIMULADO: '1' }))).toBe('nao-configurado');
    expect(simuladoPermitido(prod({ PERMITIR_SIMULADO: '1' }))).toBe(false);
    expect(simuladoPermitido(hml())).toBe(true);
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

describe('podeSimularPagamento (sexta varredura)', () => {
  const pendente = { status: 'pendente', provedor: 'simulado' };
  it('na homologação, pedido pendente e simulado de clube sem conta: pode', () => {
    expect(podeSimularPagamento(pendente, outro, hml())).toBe(true);
  });
  it('clube que conectou uma conta real: não pode, mesmo com o pedido simulado', () => {
    const conectado = { ...outro, mpAccessToken: 'v1.cifrado', mpConectado: true };
    expect(podeSimularPagamento(pendente, conectado, hml())).toBe(false);
    expect(podeSimularPagamento(pendente, cf, hml({ MP_ACCESS_TOKEN: 'x' }))).toBe(false);
  });
  it('pedido expirado, cancelado, pago ou em conflito: não pode', () => {
    for (const status of ['expirado', 'cancelado', 'pago', 'pago_conflito']) {
      expect(podeSimularPagamento({ status, provedor: 'simulado' }, outro, hml())).toBe(false);
    }
  });
  it('pedido que não é do provedor simulado (inclusive o provisório "criando"): não pode', () => {
    for (const provedor of ['criando', 'mercadopago', 'gratuito']) {
      expect(podeSimularPagamento({ status: 'pendente', provedor }, outro, hml())).toBe(false);
    }
  });
  it('em produção, nunca', () => {
    expect(podeSimularPagamento(pendente, outro, prod({ PERMITIR_SIMULADO: '1' }))).toBe(false);
  });
});
