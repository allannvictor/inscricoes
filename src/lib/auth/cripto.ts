import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

function segredo(): string {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET não configurado.');
  return s ?? 'segredo-de-desenvolvimento';
}

export function hmac(valor: string): string {
  return createHmac('sha256', segredo()).update(valor).digest('hex');
}

export function iguais(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function codigoSeisDigitos(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function tokenAleatorio(): string {
  return randomBytes(32).toString('base64url');
}
