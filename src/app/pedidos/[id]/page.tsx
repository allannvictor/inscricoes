import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PixPagamento } from '@/components/PixPagamento';
import { podeVerPedido } from '@/lib/auth/permissoes';
import { paraPermissao, usuarioAtual } from '@/lib/auth/sessao';
import { pedidoCompleto } from '@/lib/pedidos/consultas';
import { expirarPendentes } from '@/lib/pedidos/servico';
import { db } from '@/db';
import { formatarDataHora } from '@/lib/regras/datas';
import { formatarReais, nomeMotivo, type MotivoDesconto } from '@/lib/regras/preco';
import { TemaClube } from '@/components/TemaClube';
import { podeSimularPagamento } from '@/lib/pagamento';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pedido', robots: { index: false } };

export default async function Pedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await usuarioAtual();
  if (!usuario) redirect(`/entrar?voltar=/pedidos/${id}`);

  await expirarPendentes(db);
  const dados = await pedidoCompleto(id);
  // Não dizemos se o pedido existe: quem não tem permissão vê "não encontrado".
  if (!dados || !podeVerPedido(paraPermissao(usuario), dados.pedido, dados.clube.id)) notFound();
  const { pedido, evento, clube, inscricoes } = dados;
  const codigoCurto = pedido.id.slice(0, 8).toUpperCase();

  const resumo = (
    <div className="flex flex-col gap-1.5">
      {inscricoes.map(({ inscricao, distancia }) => (
        <div key={inscricao.id} className="flex justify-between gap-2 text-sm">
          <span>
            {inscricao.nome} · {distancia}
            {inscricao.motivoDesconto ? ` · ${nomeMotivo(inscricao.motivoDesconto as Exclude<MotivoDesconto, null>, clube.nomePrecoEspecial)}` : ''}
          </span>
          <span className="num">{formatarReais(inscricao.precoCentavos)}</span>
        </div>
      ))}
      <div className="mt-1 flex items-baseline justify-between border-t border-linha pt-2.5">
        <span className="rotulo">Total</span>
        <strong className="num font-display text-[1.9rem] font-extrabold">{formatarReais(pedido.totalCentavos)}</strong>
      </div>
    </div>
  );

  if (pedido.status === 'pago') {
    return (
      <TemaClube cor={clube.cor}>
      <div className="pagina">
        <section className="cartao">
          <div className="flex flex-col items-center gap-1.5 py-1.5 text-center">
            <div className="grid h-[54px] w-[54px] place-items-center rounded-full bg-ok-fundo text-3xl font-extrabold text-ok" aria-hidden>✓</div>
            <h1 className="titulo-2">Inscrição confirmada</h1>
            <p className="text-suave">
              {pedido.totalCentavos > 0 ? <>Pagamento de {formatarReais(pedido.totalCentavos)} recebido. </> : null}
              Enviamos a confirmação para <b>{usuario.email}</b>.
            </p>
          </div>
          {inscricoes.map(({ inscricao, distancia }) => (
            <div key={inscricao.id} className="numero-peito">
              <span className="n num">{inscricao.numero}</span>
              <b>{inscricao.nome}</b>
              <span className="text-sm">
                {distancia}
                {inscricao.categoria ? ` · ${inscricao.categoria}` : ''}
                {inscricao.camisa ? ` · camisa ${inscricao.camisa}` : ''}
              </span>
            </div>
          ))}
          <p className="text-sm text-suave">Número de inscrição. O número de peito é entregue na retirada do kit.</p>
        </section>
        <Link href="/minhas-inscricoes" className="botao botao-primario w-full">Ver minhas inscrições</Link>
        <Link href={`/eventos/${evento.slug}`} className="botao botao-borda w-full">Voltar ao evento</Link>
      </div>
      </TemaClube>
    );
  }

  if (pedido.status === 'pendente') {
    return (
      <TemaClube cor={clube.cor}>
      <div className="pagina lg:max-w-[880px]">
        <section className="cartao">
          <div className="flex items-center justify-between">
            <h1 className="titulo-2">Pagamento</h1>
            <span className="selo selo-alerta">Pedido {codigoCurto}</span>
          </div>
          <p className="text-sm text-suave">{evento.nome} · {formatarDataHora(evento.dataHora)}</p>
          {resumo}
          <PixPagamento
            pedidoId={pedido.id}
            copiaECola={pedido.pixCopiaECola ?? ''}
            qrBase64={pedido.pixQrBase64 ?? ''}
            expiraEm={pedido.expiraEm.toISOString()}
            simulado={podeSimularPagamento(pedido, clube)}
          />
        </section>
      </div>
      </TemaClube>
    );
  }

  const textos: Record<string, { titulo: string; texto: string }> = {
    expirado: { titulo: 'Pix expirado', texto: 'O prazo de 30 minutos acabou e as vagas foram liberadas. Se ainda quiser participar, faça a inscrição de novo.' },
    cancelado: { titulo: 'Pedido cancelado', texto: 'Este pedido foi cancelado. Se precisar, faça a inscrição de novo.' },
    pago_conflito: { titulo: 'Pagamento recebido, mas precisamos falar com você', texto: 'O Pix caiu depois do prazo e a vaga já tinha sido ocupada. A organização vai entrar em contato para resolver.' },
  };
  const t = textos[pedido.status] ?? textos.cancelado;
  return (
    <div className="pagina">
      <section className="cartao">
        <h1 className="titulo-2">{t.titulo}</h1>
        <p>{t.texto}</p>
        {resumo}
      </section>
      <Link href={`/eventos/${evento.slug}/inscricao`} className="botao botao-primario w-full">Fazer nova inscrição</Link>
    </div>
  );
}
