import { exigirClube } from '@/lib/painel/acesso';
import { modoSimulado } from '@/lib/pagamento';

export const metadata = { title: 'Pagamento', robots: { index: false } };

export default async function Pagamento({ params }: { params: Promise<{ clube: string }> }) {
  const { clube } = await exigirClube((await params).clube);
  const simulado = modoSimulado(clube);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <section className="cartao">
        <h3 className="titulo-3">Conta de recebimento</h3>
        {simulado ? (
          <>
            <span className="selo selo-alerta self-start">Modo teste</span>
            <p>Os pagamentos estão em <b>modo simulado</b>: o Pix é de mentira e nenhum dinheiro é cobrado. Isso é normal na homologação.</p>
          </>
        ) : (
          <>
            <span className="selo selo-ok self-start">Mercado Pago conectado</span>
            <p>Os Pix caem direto na conta Mercado Pago configurada para o site. A plataforma nunca segura o dinheiro.</p>
          </>
        )}
        <p className="text-sm text-suave">Taxa: o Mercado Pago cobra cerca de 1% por Pix, descontado do valor recebido pelo clube.</p>
      </section>
      <section className="cartao">
        <h3 className="titulo-3">Formas de pagamento</h3>
        <p><span className="selo selo-ok">Ligado</span> <b>Pix</b>, com confirmação automática em segundos.</p>
        <p><span className="selo selo-neutro">Em breve</span> <b>Cartão de crédito</b>.</p>
        <p className="text-sm text-suave">Reembolsos, quando necessários, são feitos pelo app ou site do Mercado Pago. Depois, cancele a inscrição na lista de inscritos.</p>
      </section>
    </div>
  );
}
