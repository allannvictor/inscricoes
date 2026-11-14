import 'server-only';
import { headers } from 'next/headers';
import { hmac } from './cripto';

/**
 * "Impressão" do IP de quem fez a requisição, para limites de tentativas por IP.
 * Guardamos só o hash (com o SESSION_SECRET), nunca o IP em si (LGPD).
 * Na Vercel, o primeiro endereço de x-forwarded-for é o do visitante.
 */
export async function hashDoIp(): Promise<string | null> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim();
  return ip ? hmac(`ip:${ip}`) : null;
}
