import { NextResponse } from 'next/server';
import { db } from '@/db';
import { podeVerPedido } from '@/lib/auth/permissoes';
import { paraPermissao, usuarioAtual } from '@/lib/auth/sessao';
import { pedidoCompleto } from '@/lib/pedidos/consultas';
import { expirarPendentes, sincronizarPagamento } from '@/lib/pedidos/servico';
import { resumoDoErro } from '@/lib/log';

export const dynamic = 'force-dynamic';

/** Consultado pela tela do Pix a cada 5 segundos. Também confere no Mercado Pago, caso o webhook atrase. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await usuarioAtual();
  let dados = await pedidoCompleto(id);
  if (!dados || !podeVerPedido(paraPermissao(usuario), dados.pedido, dados.clube.id)) {
    return NextResponse.json({ erro: 'não encontrado' }, { status: 404 });
  }
  if (dados.pedido.status === 'pendente') {
    await sincronizarPagamento(id).catch((e) => console.error('Falha ao consultar pagamento', resumoDoErro(e)));
    await expirarPendentes(db, dados.evento.id);
    dados = (await pedidoCompleto(id))!;
  }
  return NextResponse.json({ status: dados.pedido.status });
}
