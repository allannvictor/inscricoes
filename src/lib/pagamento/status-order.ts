import type { StatusPagamento } from './tipos';

/** Status da order → status do nosso pedido. Lista: docs "Status da order". */
export function traduzirStatusOrder(status: string, detalhe?: string): StatusPagamento {
  // "processed" = pago (accredited). Reembolso parcial depois do pagamento continua contando como pago.
  if (status === 'processed') return detalhe === 'refunded' ? 'cancelado' : 'aprovado';
  if (['canceled', 'failed', 'expired', 'refunded', 'charged_back'].includes(status)) return 'cancelado';
  return 'pendente'; // created, processing, action_required
}
