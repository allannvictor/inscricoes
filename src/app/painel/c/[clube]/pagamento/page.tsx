import { BotaoDesconectarMp } from '@/components/painel/BotaoDesconectarMp';
import { exigirClube } from '@/lib/painel/acesso';
import { podePublicarEventos, situacaoDoPagamento } from '@/lib/pagamento';
import { credenciaisApp } from '@/lib/pagamento/oauth-mercadopago';
import { mensagemDoMapa } from '@/lib/regras/parametros';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pagamento', robots: { index: false } };

const ERROS: Record<string, string> = {
  'sem-app': 'A conexão com o Mercado Pago ainda não foi configurada no site (MP_CLIENT_ID e MP_CLIENT_SECRET). Fale com o administrador da plataforma.',
  recusado: 'A conexão foi cancelada no Mercado Pago. Tente de novo.',
  falhou: 'O Mercado Pago não confirmou a conexão. Tente de novo em instantes.',
};

const data = (d: Date | null) => (d ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short' }).format(d) : '');

export default async function Pagamento({ params, searchParams }: { params: Promise<{ clube: string }>; searchParams: Promise<{ erro?: string | string[]; conectado?: string | string[] }> }) {
  const { clube } = await exigirClube((await params).clube);
  const { erro, conectado } = await searchParams;
  const situacao = situacaoDoPagamento(clube);
  const app = !!credenciaisApp();
  const linkConectar = `/painel/c/${clube.slug}/pagamento/conectar`;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <section className="cartao">
        <h3 className="titulo-3">Conta de recebimento</h3>
        {conectado && <p className="selo selo-ok self-start">Mercado Pago conectado com sucesso.</p>}
        {erro && <p className="erros" role="alert">{mensagemDoMapa(ERROS, erro) ?? 'Não foi possível conectar. Tente de novo.'}</p>}

        {situacao === 'conectado' && (
          <>
            <span className="selo selo-ok self-start">Mercado Pago conectado</span>
            <p>Os Pix das inscrições caem direto na conta Mercado Pago do clube. A plataforma nunca segura o dinheiro.</p>
            <p className="text-sm text-suave">
              Conta nº {clube.mpUserId ?? '—'} · conectada em {data(clube.mpConectadoEm)}. A conexão é renovada sozinha.
            </p>
            <div className="flex flex-wrap gap-2">
              {app && <a className="botao botao-borda botao-pequeno" href={linkConectar}>Conectar outra conta</a>}
              <BotaoDesconectarMp clubeId={clube.id} />
            </div>
          </>
        )}

        {situacao === 'ambiente' && (
          <>
            <span className="selo selo-ok self-start">Conta configurada no site</span>
            <p>Os Pix caem na conta Mercado Pago configurada na hospedagem do site para este clube.</p>
            {app && (
              <>
                <p className="text-sm text-suave">Se preferir, conecte a conta do clube por aqui. Depois de conectada, ela passa a valer no lugar da configurada no site.</p>
                <a className="botao botao-borda botao-pequeno self-start" href={linkConectar}>Conectar Mercado Pago</a>
              </>
            )}
          </>
        )}

        {(situacao === 'simulado' || situacao === 'nao-configurado') && (
          <>
            {situacao === 'simulado' ? <span className="selo selo-alerta self-start">Modo teste</span> : <span className="selo selo-erro self-start">Não conectado</span>}
            <p>
              Conecte a conta Mercado Pago do clube para receber os Pix das inscrições direto nela.
              {situacao === 'simulado' && ' Enquanto isso, os pagamentos são simulados: o Pix é de mentira e nada é cobrado.'}
            </p>
            {!podePublicarEventos(clube) && <p className="text-sm font-semibold">Os eventos só podem ser publicados depois da conexão.</p>}
            {app ? (
              <a className="botao botao-primario self-start" href={linkConectar}>Conectar Mercado Pago</a>
            ) : (
              <p className="text-sm text-suave">{ERROS['sem-app']}</p>
            )}
            <p className="text-sm text-suave">Você vai entrar na conta Mercado Pago do clube e autorizar o Inscrições Fast a criar cobranças Pix. Não temos acesso à sua senha nem ao saldo.</p>
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
