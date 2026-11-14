import { describe, expect, it } from 'vitest';
import { decidirAcesso } from './pre-lancamento';

const base = { ligado: true, chave: 'segredo123', caminho: '/eventos/x', acessoNaUrl: null, cookie: undefined };

describe('Modo em breve', () => {
  it('desligado: libera tudo', () => expect(decidirAcesso({ ...base, ligado: false })).toBe('liberar'));
  it('ligado: público vê em breve', () => expect(decidirAcesso(base)).toBe('em_breve'));
  it('link com a chave libera e grava cookie', () => expect(decidirAcesso({ ...base, acessoNaUrl: 'segredo123' })).toBe('liberar_e_gravar_cookie'));
  it('chave errada não libera', () => expect(decidirAcesso({ ...base, acessoNaUrl: 'outra' })).toBe('em_breve'));
  it('cookie com a chave libera', () => expect(decidirAcesso({ ...base, cookie: 'segredo123' })).toBe('liberar'));
  it('webhook e status continuam abertos', () => {
    expect(decidirAcesso({ ...base, caminho: '/api/webhooks/mercadopago', metodo: 'POST' })).toBe('liberar');
    expect(decidirAcesso({ ...base, caminho: '/api/status' })).toBe('liberar');
  });
  it('sem chave configurada ninguém passa', () => expect(decidirAcesso({ ...base, chave: undefined, acessoNaUrl: 'x' })).toBe('em_breve'));
  it('a página "em breve" e o status só abrem para leitura: POST fica bloqueado', () => {
    expect(decidirAcesso({ ...base, caminho: '/em-breve', metodo: 'GET' })).toBe('liberar');
    expect(decidirAcesso({ ...base, caminho: '/em-breve', metodo: 'POST' })).toBe('em_breve');
    expect(decidirAcesso({ ...base, caminho: '/em-breve/x', metodo: 'GET' })).toBe('em_breve');
    expect(decidirAcesso({ ...base, caminho: '/api/status', metodo: 'POST' })).toBe('em_breve');
    expect(decidirAcesso({ ...base, caminho: '/api/webhooks/mercadopago', metodo: 'POST' })).toBe('liberar');
    // Endereço inventado sob /api/webhooks/ não abre (cairia na página "não encontrado", que executa ações).
    expect(decidirAcesso({ ...base, caminho: '/api/webhooks/x', metodo: 'POST' })).toBe('em_breve');
    expect(decidirAcesso({ ...base, caminho: '/api/webhooks/mercadopago/x', metodo: 'POST' })).toBe('em_breve');
  });
  it('fecha os caminhos alternativos achados na quarta varredura', () => {
    const post = (caminho: string, ehAcao = true) => decidirAcesso({ ...base, caminho, metodo: 'POST', ehAcao });
    for (const c of ['/favicon.ico', '/favicon.icoX', '/favicon.ico/x', '/_next/staticX', '/_next/image/x', '/api/webhooks/mercadopago.rsc', '/_next/data/abc/api/webhooks/mercadopago']) {
      expect(post(c)).toBe('em_breve');
    }
    // O webhook com cara de Server Action também não passa; o webhook de verdade passa.
    expect(post('/api/webhooks/mercadopago', true)).toBe('em_breve');
    expect(post('/api/webhooks/mercadopago', false)).toBe('liberar');
    // Leitura do ícone e de imagens continua liberada.
    expect(decidirAcesso({ ...base, caminho: '/favicon.ico', metodo: 'GET' })).toBe('liberar');
    expect(decidirAcesso({ ...base, caminho: '/_next/image', metodo: 'GET' })).toBe('liberar');
    // Com a chave no cookie, tudo passa.
    expect(decidirAcesso({ ...base, caminho: '/', metodo: 'POST', ehAcao: true, cookie: 'segredo123' })).toBe('liberar');
  });
});
