import { describe, expect, it } from 'vitest';
import { problemaDaSenha } from './senha';

describe('problemaDaSenha', () => {
  it('aceita uma senha razoável', () => {
    expect(problemaDaSenha('corrida-de-domingo', 'ana@x.com')).toBeNull();
  });
  it('recusa curta, repetida, comum ou igual ao e-mail', () => {
    expect(problemaDaSenha('abc123')).toMatch(/pelo menos 8/);
    expect(problemaDaSenha('aaaaaaaaaa')).toMatch(/menos óbvia/);
    expect(problemaDaSenha('12345678')).toMatch(/muito comum/);
    expect(problemaDaSenha('Ana@X.com', 'ana@x.com')).toMatch(/e-mail/);
    expect(problemaDaSenha('x'.repeat(129) + 'y')).toMatch(/no máximo/);
  });
});
