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
    expect(decidirAcesso({ ...base, caminho: '/api/webhooks/mercadopago' })).toBe('liberar');
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
});
