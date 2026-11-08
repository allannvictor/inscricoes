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
});
