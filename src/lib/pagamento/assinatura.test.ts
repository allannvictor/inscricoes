import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { assinaturaValida } from './assinatura';

describe('Assinatura do webhook do Mercado Pago', () => {
  const segredo = 'segredo-teste';
  const ts = '1704908010';
  const v1 = createHmac('sha256', segredo).update(`id:123456;request-id:req-1;ts:${ts};`).digest('hex');
  it('aceita assinatura correta', () => {
    expect(assinaturaValida({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: 'req-1', dataId: '123456', segredo })).toBe(true);
  });
  it('recusa assinatura errada ou ausente', () => {
    expect(assinaturaValida({ xSignature: `ts=${ts},v1=abc`, xRequestId: 'req-1', dataId: '123456', segredo })).toBe(false);
    expect(assinaturaValida({ xSignature: null, xRequestId: 'req-1', dataId: '123456', segredo })).toBe(false);
    expect(assinaturaValida({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: 'req-1', dataId: '999', segredo })).toBe(false);
  });
});
