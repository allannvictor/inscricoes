import 'server-only';
import type { ConsultaPagamento, CriarPixEntrada, DadosPix, ProvedorPagamento, StatusPagamento } from './tipos';

/**
 * Mercado Pago: Pix pela API de Pagamentos (Checkout Transparente).
 * Docs: https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post
 */

const API = 'https://api.mercadopago.com';

/** Data no formato que o Mercado Pago aceita, no fuso de Brasília: 2026-12-01T10:30:00.000-03:00 */
export function dataMercadoPago(d: Date): string {
  const local = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return local.toISOString().replace('Z', '-03:00');
}

function traduzirStatus(s: string): StatusPagamento {
  if (s === 'approved') return 'aprovado';
  if (s === 'rejected') return 'recusado';
  if (s === 'cancelled' || s === 'refunded' || s === 'charged_back') return 'cancelado';
  return 'pendente';
}

export function criarMercadoPago(accessToken: string, appUrl: string | undefined): ProvedorPagamento {
  async function chamar(caminho: string, init: RequestInit = {}) {
    const resposta = await fetch(API + caminho, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      cache: 'no-store',
    });
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      console.error('Mercado Pago', resposta.status, JSON.stringify(corpo));
      throw new Error('O Mercado Pago não respondeu como esperado. Tente de novo em instantes.');
    }
    return corpo;
  }

  return {
    nome: 'mercadopago',
    async criarPix(e: CriarPixEntrada): Promise<DadosPix> {
      const [primeiro, ...resto] = e.comprador.nome.trim().split(/\s+/);
      const corpo: Record<string, unknown> = {
        transaction_amount: e.totalCentavos / 100,
        description: e.descricao.slice(0, 250),
        payment_method_id: 'pix',
        external_reference: e.pedidoId,
        date_of_expiration: dataMercadoPago(e.expiraEm),
        payer: {
          email: e.comprador.email,
          first_name: primeiro ?? '',
          last_name: resto.join(' '),
          identification: { type: 'CPF', number: e.comprador.cpf },
        },
      };
      // O Mercado Pago só aceita notification_url pública em https.
      if (appUrl?.startsWith('https://')) corpo.notification_url = `${appUrl}/api/webhooks/mercadopago`;
      const r = await chamar('/v1/payments', {
        method: 'POST',
        headers: { 'X-Idempotency-Key': e.pedidoId },
        body: JSON.stringify(corpo),
      });
      const t = r.point_of_interaction?.transaction_data ?? {};
      if (!t.qr_code) throw new Error('O Mercado Pago não devolveu o código Pix.');
      return { pagamentoId: String(r.id), copiaECola: t.qr_code, qrBase64: t.qr_code_base64 ?? '' };
    },
    async consultar(pagamentoId: string): Promise<ConsultaPagamento> {
      const r = await chamar(`/v1/payments/${encodeURIComponent(pagamentoId)}`);
      const taxa = Array.isArray(r.fee_details) ? r.fee_details.reduce((s: number, f: { amount: number }) => s + (f.amount ?? 0), 0) : null;
      return {
        status: traduzirStatus(r.status),
        pedidoId: r.external_reference ?? null,
        valorCentavos: Math.round(Number(r.transaction_amount ?? 0) * 100),
        taxaCentavos: taxa == null ? null : Math.round(taxa * 100),
      };
    },
  };
}
