import { createHmac, timingSafeEqual } from 'node:crypto';

const iguais = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

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
  const calcular = (id: string) => {
    let manifesto = `id:${id};`;
    if (args.xRequestId) manifesto += `request-id:${args.xRequestId};`;
    manifesto += `ts:${partes.ts};`;
    return createHmac('sha256', args.segredo).update(manifesto).digest('hex');
  };
  // O SDK oficial usa o id como veio; a documentação antiga pedia minúsculas. Aceitamos os dois.
  return [args.dataId, args.dataId.toLowerCase()].some((id) => iguais(calcular(id), partes.v1));
}
