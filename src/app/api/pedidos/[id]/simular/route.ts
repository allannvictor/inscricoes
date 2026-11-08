import { NextResponse } from 'next/server';
import { usuarioAtual } from '@/lib/auth/sessao';
import { simuladoPermitido } from '@/lib/pagamento';
import { pedidoCompleto } from '@/lib/pedidos/consultas';
import { confirmarPagamento } from '@/lib/pedidos/servico';

/** Modo teste: confirma um pedido simulado. Só o comprador, e só quando o modo simulado está permitido. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await usuarioAtual();
  const dados = await pedidoCompleto(id);
  if (!usuario || !dados || dados.pedido.compradorId !== usuario.id || dados.pedido.provedor !== 'simulado' || !simuladoPermitido()) {
    return NextResponse.json({ erro: 'não encontrado' }, { status: 404 });
  }
  await confirmarPagamento(id, null);
  return NextResponse.json({ ok: true });
}
