import 'server-only';
import { traduzirStatusOrder } from './status-order';
import type { ConsultaPagamento, CriarPixEntrada, DadosPix, ProvedorPagamento } from './tipos';

/**
 * Mercado Pago: Pix pela API de Orders (Checkout Transparente).
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix
 *
 * Guardamos o id da order (ex.: "ORD01H...") em pedidos.pagamento_id. A confirmação chega pelo
 * webhook do tópico "Order" e também pela consulta GET /v1/orders/{id} que a tela do Pix faz.
 */

const API = 'https://api.mercadopago.com';

/** Tempo para pagar o Pix, em duração ISO 8601. O Mercado Pago aceita de 30 minutos a 30 dias. */
export const VALIDADE_PIX = 'PT30M';

const reais = (centavos: number) => (centavos / 100).toFixed(2);

export function criarMercadoPago(accessToken: string): ProvedorPagamento {
  async function chamar(caminho: string, init: RequestInit = {}) {
    const resposta = await fetch(API + caminho, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', accept: 'application/json', ...(init.headers ?? {}) },
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
      const total = reais(e.totalCentavos);
      const order = await chamar('/v1/orders', {
        method: 'POST',
        headers: { 'X-Idempotency-Key': e.pedidoId },
        body: JSON.stringify({
          type: 'online',
          processing_mode: 'automatic',
          total_amount: total,
          external_reference: e.pedidoId,
          transactions: {
            payments: [{ amount: total, payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: VALIDADE_PIX }],
          },
          payer: {
            email: e.comprador.email,
            first_name: primeiro ?? '',
            last_name: resto.join(' '),
            identification: { type: 'CPF', number: e.comprador.cpf },
          },
        }),
      });
      const metodo = order.transactions?.payments?.[0]?.payment_method ?? {};
      if (!order.id || !metodo.qr_code) throw new Error('O Mercado Pago não devolveu o código Pix.');
      return { pagamentoId: String(order.id), copiaECola: metodo.qr_code, qrBase64: metodo.qr_code_base64 ?? '' };
    },
    async consultar(orderId: string): Promise<ConsultaPagamento> {
      const order = await chamar(`/v1/orders/${encodeURIComponent(orderId)}`);
      const pago = Number(order.total_paid_amount ?? (order.status === 'processed' ? order.total_amount : 0));
      return {
        status: traduzirStatusOrder(order.status, order.status_detail),
        pedidoId: order.external_reference ?? null,
        valorCentavos: Math.round(pago * 100),
        taxaCentavos: null, // a API de Orders não informa a taxa aqui; aparece no extrato do Mercado Pago
      };
    },
  };
}
