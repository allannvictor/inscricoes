import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CONTROLE, semCaractereNulo } from './texto';

describe('caracteres de controle', () => {
  const schema = z.object({ nome: z.string(), lista: z.array(z.object({ x: z.string() })) }).superRefine(semCaractereNulo);
  it('recusa o nulo em qualquer nível, inclusive dentro de listas', () => {
    expect(schema.safeParse({ nome: 'Ana', lista: [{ x: 'ok' }] }).success).toBe(true);
    expect(schema.safeParse({ nome: 'Ana\u0000', lista: [] }).success).toBe(false);
    expect(schema.safeParse({ nome: 'Ana', lista: [{ x: 'a\u0000b' }] }).success).toBe(false);
  });
  it('aceita quebra de linha em textos longos', () => {
    expect(schema.safeParse({ nome: 'linha 1\nlinha 2', lista: [] }).success).toBe(true);
  });
  it('CONTROLE pega nulo, tab e quebra de linha (para campos de uma linha)', () => {
    expect(CONTROLE.test('a\u0000b')).toBe(true);
    expect(CONTROLE.test('a\nb')).toBe(true);
    expect(CONTROLE.test('ana@exemplo.com')).toBe(false);
  });
});
