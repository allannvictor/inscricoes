import { describe, expect, it } from 'vitest';
import { destinoInterno } from './redirecionamento';

describe('destinoInterno', () => {
  it('aceita caminhos do próprio site', () => {
    expect(destinoInterno('/minhas-inscricoes')).toBe('/minhas-inscricoes');
    expect(destinoInterno('/painel/c/cf-assessoria?aba=x#y')).toBe('/painel/c/cf-assessoria?aba=x#y');
    expect(destinoInterno('/eventos/simulado-10k/inscricao')).toBe('/eventos/simulado-10k/inscricao');
  });

  it('recusa qualquer coisa que leve para outro site', () => {
    for (const ruim of [
      '//site-falso.com',
      '/\\site-falso.com',
      '/\\/site-falso.com',
      '/\t/site-falso.com',
      '/\n/site-falso.com',
      'https://site-falso.com',
      'javascript:alert(1)',
      '/..//site-falso.com',
      '/a/../..//site-falso.com',
      '/./..//site-falso.com',
      '/%2e%2e//site-falso.com',
      'site-falso.com',
      '',
      null,
      undefined,
    ]) {
      expect(destinoInterno(ruim as string)).toBe('/');
    }
  });

  it('usa o padrão informado', () => {
    expect(destinoInterno('//x.com', '/painel')).toBe('/painel');
  });
});
