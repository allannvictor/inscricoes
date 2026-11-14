import { describe, expect, it } from 'vitest';
import { limparTextoTecnico, resumoErroMercadoPago } from './erro-mercadopago';

describe('resumoErroMercadoPago (log sem dados pessoais)', () => {
  it('402 da API de Orders: código, motivo do pagamento e mensagem técnica', () => {
    const corpo = {
      errors: [{ code: 'failed', message: 'The following transactions failed', details: ['pix: collector without pix key'] }],
      data: {
        id: 'ORD01ABC',
        status: 'failed',
        status_detail: 'failed',
        payer: { email: 'allan@exemplo.com', first_name: 'Allan', identification: { type: 'CPF', number: '52998224725' } },
        transactions: { payments: [{ status: 'failed', status_detail: 'rejected_by_bank' }] },
      },
    };
    const r = resumoErroMercadoPago(402, corpo);
    expect(r).toBe(
      'status=402 codigo=failed order=failed pagamento=failed motivo=rejected_by_bank mensagem=The following transactions failed detalhes=pix: collector without pix key',
    );
    // Nada do pagador vai para o log.
    expect(r).not.toContain('allan');
    expect(r).not.toContain('52998224725');
    expect(r).not.toContain('Allan');
  });

  it('formatos antigos (error/message na raiz) e corpo vazio', () => {
    expect(resumoErroMercadoPago(400, { error: 'invalid_grant', message: 'invalid code' })).toBe('status=400 codigo=invalid_grant mensagem=invalid code');
    expect(resumoErroMercadoPago(500, null)).toBe('status=500');
    expect(resumoErroMercadoPago(502, 'texto')).toBe('status=502');
  });

  it('apaga e-mails, CPFs e números longos que venham na mensagem', () => {
    const r = resumoErroMercadoPago(400, { errors: [{ code: 'invalid', message: 'payer allan@exemplo.com with doc 529.982.247-25 phone (79) 99999-0000 invalid' }] });
    expect(r).toContain('codigo=invalid');
    expect(r).not.toMatch(/allan|529|99999/);
    expect(r).toContain('[e-mail]');
    expect(r).toContain('[número]');
  });

  it('limparTextoTecnico corta e tira caracteres de controle', () => {
    expect(limparTextoTecnico('a\nb\u0000c', 10)).toBe('a b c');
    expect(limparTextoTecnico('x'.repeat(500)).length).toBe(120);
    expect(limparTextoTecnico('erro 402 em 2026')).toBe('erro 402 em 2026'); // números curtos ficam
  });
});
