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
  it('aceita id de order (letras maiúsculas) como veio ou em minúsculas', () => {
    const id = 'ORD01M28P44G5FG8RJPM579EH56FV';
    const comoVeio = createHmac('sha256', segredo).update(`id:${id};request-id:req-2;ts:${ts};`).digest('hex');
    const minusculo = createHmac('sha256', segredo).update(`id:${id.toLowerCase()};request-id:req-2;ts:${ts};`).digest('hex');
    expect(assinaturaValida({ xSignature: `ts=${ts},v1=${comoVeio}`, xRequestId: 'req-2', dataId: id, segredo })).toBe(true);
    expect(assinaturaValida({ xSignature: `ts=${ts},v1=${minusculo}`, xRequestId: 'req-2', dataId: id, segredo })).toBe(true);
  });
  it('recusa assinatura errada ou ausente', () => {
    expect(assinaturaValida({ xSignature: `ts=${ts},v1=abc`, xRequestId: 'req-1', dataId: '123456', segredo })).toBe(false);
    expect(assinaturaValida({ xSignature: null, xRequestId: 'req-1', dataId: '123456', segredo })).toBe(false);
    expect(assinaturaValida({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: 'req-1', dataId: '999', segredo })).toBe(false);
  });
});

describe('Status da order do Mercado Pago', () => {
  it('traduz para o status do pedido', async () => {
    const { traduzirStatusOrder } = await import('./status-order');
    expect(traduzirStatusOrder('processed', 'accredited')).toBe('aprovado');
    expect(traduzirStatusOrder('action_required', 'waiting_transfer')).toBe('pendente');
    expect(traduzirStatusOrder('created', 'created')).toBe('pendente');
    expect(traduzirStatusOrder('canceled', 'expired')).toBe('cancelado');
    expect(traduzirStatusOrder('failed', 'expired')).toBe('cancelado');
    expect(traduzirStatusOrder('processed', 'refunded')).toBe('cancelado');
  });
});
