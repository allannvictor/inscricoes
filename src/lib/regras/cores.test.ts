import { describe, expect, it } from 'vitest';
import { COR_PADRAO, contraste, normalizarCor, temaDoClube } from './cores';

describe('normalizarCor', () => {
  it('aceita #RGB, #RRGGBB e sem #', () => {
    expect(normalizarCor('#0e6b4a')).toBe('#0E6B4A');
    expect(normalizarCor('0E6B4A')).toBe('#0E6B4A');
    expect(normalizarCor('#fa0')).toBe('#FFAA00');
  });
  it('recusa o que não é cor', () => {
    expect(normalizarCor('azul')).toBeNull();
    expect(normalizarCor('#12345')).toBeNull();
    expect(normalizarCor('')).toBeNull();
    expect(normalizarCor(null)).toBeNull();
  });
});

describe('temaDoClube', () => {
  it('sem cor usa a padrão da plataforma, com texto branco', () => {
    const t = temaDoClube(null);
    expect(t.acao).toBe(COR_PADRAO);
    expect(t.acaoTexto).toBe('#FFFFFF');
    expect(t.acaoTinta).toBe(COR_PADRAO);
  });

  it('cor escura: texto branco no botão e a própria cor nos links', () => {
    const t = temaDoClube('#0E6B4A');
    expect(t.acaoTexto).toBe('#FFFFFF');
    expect(t.acaoTinta).toBe('#0E6B4A');
  });

  it('cor clara (amarelo): texto escuro no botão e links escurecidos até ficar legível', () => {
    const t = temaDoClube('#FFD400');
    expect(t.acaoTexto).toBe('#1B1F24');
    expect(t.acaoTinta).not.toBe('#FFD400');
    expect(contraste(t.acaoTinta, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });

  it('texto do botão sempre com contraste de leitura', () => {
    for (const cor of ['#B4232C', '#6D28D9', '#F97316', '#22C55E', '#0EA5E9', '#000000', '#FFFFFF']) {
      const t = temaDoClube(cor);
      expect(contraste(t.acao, t.acaoTexto)).toBeGreaterThanOrEqual(3);
    }
  });
});
