import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pedidos } from '@/db/schema';
import { assinaturaValida } from '@/lib/pagamento/assinatura';
import { sincronizarPagamento } from '@/lib/pedidos/servico';
import { resumoDoErro } from '@/lib/log';

/**
 * Webhook do Mercado Pago (Suas integrações > Webhooks > tópico "Order").
 * Nunca confiamos no conteúdo da notificação: buscamos o pagamento de novo na API antes de confirmar.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const corpo = await req.json().catch(() => ({}) as Record<string, unknown>);
  const tipo = (corpo.type as string) ?? url.searchParams.get('type') ?? url.searchParams.get('topic');
  // A assinatura usa o data.id da URL; o corpo é só reserva.
  const dataId = String(url.searchParams.get('data.id') ?? (corpo.data as { id?: string } | undefined)?.id ?? url.searchParams.get('id') ?? '');
  // Usamos a API de Orders (tópico "order"); "payment" fica aceito por compatibilidade.
  if (!['order', 'payment'].includes(tipo ?? '') || !dataId) return NextResponse.json({ ok: true });

  const segredo = process.env.MP_WEBHOOK_SECRET;
  if (segredo && !assinaturaValida({ xSignature: req.headers.get('x-signature'), xRequestId: req.headers.get('x-request-id'), dataId, segredo })) {
    return NextResponse.json({ erro: 'assinatura inválida' }, { status: 401 });
  }

  const [pedido] = await db.select({ id: pedidos.id }).from(pedidos).where(eq(pedidos.pagamentoId, dataId));
  if (pedido) {
    try {
      await sincronizarPagamento(pedido.id);
    } catch (e) {
      console.error('Webhook: falha ao confirmar', resumoDoErro(e));
      return NextResponse.json({ erro: 'tente de novo' }, { status: 500 }); // o Mercado Pago reenvia
    }
  }
  return NextResponse.json({ ok: true });
}
