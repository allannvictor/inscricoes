import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { FormularioTransferencia } from '@/components/FormularioTransferencia';
import { inscricaoCompleta } from '@/lib/atleta/consultas';
import { podeTransferirInscricao } from '@/lib/auth/permissoes';
import { paraPermissao, usuarioAtual } from '@/lib/auth/sessao';
import { dataLocal, formatarDataHora, formatarDiaMes } from '@/lib/regras/datas';
import { podeTransferir } from '@/lib/regras/transferencia';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Transferir inscrição', robots: { index: false } };

export default async function Transferir({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await usuarioAtual();
  if (!usuario) redirect(`/entrar?voltar=/inscricoes/${id}/transferir`);
  const dados = await inscricaoCompleta(id);
  if (!dados || !podeTransferirInscricao(paraPermissao(usuario), dados.inscricao, dados.pedido, dados.clube.id)) notFound();
  const { inscricao, evento, distancia } = dados;
  const permitido = podeTransferir({ ...inscricao, transferida: dados.transferida }, evento.transferenciaAte, new Date());

  return (
    <div className="pagina">
      <Link href="/minhas-inscricoes" className="link text-sm">← Minhas inscrições</Link>
      <section className="cartao">
        <h1 className="titulo-2">Transferir inscrição</h1>
        <p className="text-sm">
          <b>{evento.nome}</b> · {formatarDataHora(evento.dataHora)}
          <br />
          {distancia} · nº <span className="num">{inscricao.numero}</span> · hoje em nome de <b>{inscricao.nome}</b>
        </p>
        <p className="text-sm text-suave">
          {evento.transferenciaAte ? <>Permitido até {formatarDiaMes(evento.transferenciaAte)}. </> : null}
          O número e o valor pago continuam com a inscrição; acertos entre vocês são por fora.
        </p>
      </section>
      {dados.transferida ? (
        // Logo depois de transferir, a página se atualiza e cai aqui: mostra a confirmação.
        <section className="cartao">
          <div className="flex flex-col items-center gap-1.5 py-1.5 text-center">
            <div className="grid h-[54px] w-[54px] place-items-center rounded-full bg-ok-fundo text-3xl font-extrabold text-ok" aria-hidden>✓</div>
            <h2 className="titulo-2">Inscrição transferida</h2>
            <p className="text-suave">Hoje ela está em nome de {inscricao.nome}, que recebeu a confirmação por e-mail. O número continua o mesmo.</p>
            <p className="text-sm">Esta inscrição já foi transferida uma vez e não pode ser transferida de novo.</p>
          </div>
          <Link href="/minhas-inscricoes" className="botao botao-primario w-full">Voltar para minhas inscrições</Link>
        </section>
      ) : permitido ? (
        <FormularioTransferencia inscricaoId={inscricao.id} pedeCamisa={evento.pedeCamisa} usaCategoria={evento.usaCategoria} hoje={dataLocal(new Date())} />
      ) : (
        <div className="cartao">
          <p>
            {inscricao.status !== 'confirmada'
              ? 'Só inscrições confirmadas podem ser transferidas.'
              : evento.transferenciaAte
                ? 'O prazo de transferência deste evento já acabou. Fale com a organização.'
                : 'Este evento não permite transferência pelo site. Fale com a organização.'}
          </p>
        </div>
      )}
    </div>
  );
}
