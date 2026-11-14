import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

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

/**
 * Criptografia de segredos guardados no banco (tokens do Mercado Pago de cada clube).
 * AES-256-GCM com chave derivada do SESSION_SECRET. Atenção: trocar o SESSION_SECRET
 * invalida os tokens salvos, e os clubes precisam conectar o Mercado Pago de novo.
 */
function chaveSegredos(): Buffer {
  return Buffer.from(hkdfSync('sha256', segredo(), 'inscricoes-fast', 'segredos-no-banco', 32));
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chaveSegredos(), iv);
  const dados = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), dados.toString('base64url')].join('.');
}

/** Devolve o texto original, ou null se o valor foi adulterado ou a chave mudou. Valor antigo, sem "v1.", volta como está. */
export function decifrar(valor: string | null | undefined): string | null {
  if (!valor) return null;
  if (!valor.startsWith('v1.')) return valor;
  const [, iv, tag, dados] = valor.split('.');
  try {
    const d = createDecipheriv('aes-256-gcm', chaveSegredos(), Buffer.from(iv, 'base64url'));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([d.update(Buffer.from(dados, 'base64url')), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** PKCE (OAuth): verificador aleatório e o desafio S256 correspondente. */
export function pkce(): { verificador: string; desafio: string } {
  const verificador = randomBytes(48).toString('base64url'); // 64 caracteres
  return { verificador, desafio: createHash('sha256').update(verificador).digest('base64url') };
}
