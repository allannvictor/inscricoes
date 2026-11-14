/**
 * Confere o tipo do arquivo pelos primeiros bytes (a "assinatura"), sem confiar no tipo informado pelo navegador.
 * Varredura de segurança de 14/11/2026.
 */
export function tipoPelosBytes(b: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' | null {
  const comeca = (...v: number[]) => v.every((x, i) => b[i] === x);
  const texto = (inicio: number, s: string) => [...s].every((c, i) => b[inicio + i] === c.charCodeAt(0));
  if (comeca(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (comeca(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if (texto(0, 'RIFF') && texto(8, 'WEBP')) return 'image/webp';
  if (texto(0, '%PDF-')) return 'application/pdf';
  return null;
}
