import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { cifrar, decifrar, pkce } from './cripto';

describe('cifrar/decifrar', () => {
  it('volta o texto original e não guarda o texto em claro', () => {
    const c = cifrar('APP_USR-123-token');
    expect(c.startsWith('v1.')).toBe(true);
    expect(c).not.toContain('APP_USR');
    expect(decifrar(c)).toBe('APP_USR-123-token');
  });
  it('cada cifra é diferente (iv aleatório)', () => {
    expect(cifrar('x')).not.toBe(cifrar('x'));
  });
  it('valor adulterado devolve null', () => {
    const c = cifrar('segredo');
    const partes = c.split('.');
    partes[3] = Buffer.from('outra coisa').toString('base64url');
    expect(decifrar(partes.join('.'))).toBeNull();
  });
  it('valor antigo sem prefixo volta como está; vazio é null', () => {
    expect(decifrar('APP_USR-antigo')).toBe('APP_USR-antigo');
    expect(decifrar(null)).toBeNull();
  });
});

describe('pkce', () => {
  it('desafio é o SHA-256 do verificador em base64url', () => {
    const { verificador, desafio } = pkce();
    expect(verificador.length).toBeGreaterThanOrEqual(43);
    expect(desafio).toBe(createHash('sha256').update(verificador).digest('base64url'));
  });
});
