import { describe, expect, it } from 'vitest';
import { tipoPelosBytes } from './tipo-arquivo';

const bytes = (...v: Array<number | string>) =>
  Uint8Array.from(v.flatMap((x) => (typeof x === 'string' ? [...x].map((c) => c.charCodeAt(0)) : [x])));

describe('tipoPelosBytes', () => {
  it('reconhece JPG, PNG, WEBP e PDF pela assinatura', () => {
    expect(tipoPelosBytes(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(tipoPelosBytes(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe('image/png');
    expect(tipoPelosBytes(bytes('RIFF', 0, 0, 0, 0, 'WEBPVP8 '))).toBe('image/webp');
    expect(tipoPelosBytes(bytes('%PDF-1.7'))).toBe('application/pdf');
  });
  it('recusa HTML, SVG ou executável disfarçado', () => {
    expect(tipoPelosBytes(bytes('<html><script>'))).toBeNull();
    expect(tipoPelosBytes(bytes('<svg xmlns='))).toBeNull();
    expect(tipoPelosBytes(bytes('MZ', 0x90, 0))).toBeNull();
    expect(tipoPelosBytes(new Uint8Array())).toBeNull();
  });
});
