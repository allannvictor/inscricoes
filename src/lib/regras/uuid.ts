/**
 * Confere se o valor é um UUID de verdade (8-4-4-4-12 dígitos hexadecimais).
 * A regra antiga (`^[0-9a-f-]{36}$`) aceitava 36 hifens, e o Postgres respondia com erro 500
 * (sexta varredura de segurança, 14/11/2026).
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ehUuid(valor: unknown): valor is string {
  return typeof valor === 'string' && UUID.test(valor);
}
