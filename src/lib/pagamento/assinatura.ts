import { createHmac } from 'node:crypto';

/**
 * Confere a assinatura do webhook (cabeçalho x-signature: "ts=...,v1=...").
 * Manifesto: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 */
export function assinaturaValida(args: { xSignature: string | null; xRequestId: string | null; dataId: string; segredo: string }): boolean {
  if (!args.xSignature) return false;
  const partes = Object.fromEntries(
    args.xSignature.split(',').map((p) => {
      const [k, ...v] = p.trim().split('=');
      return [k, v.join('=')];
    }),
  );
  if (!partes.ts || !partes.v1) return false;
  const id = /^[a-z0-9]+$/i.test(args.dataId) ? args.dataId.toLowerCase() : args.dataId;
  let manifesto = `id:${id};`;
  if (args.xRequestId) manifesto += `request-id:${args.xRequestId};`;
  manifesto += `ts:${partes.ts};`;
  const esperado = createHmac('sha256', args.segredo).update(manifesto).digest('hex');
  return esperado === partes.v1;
}
