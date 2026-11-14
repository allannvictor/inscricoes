import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BotaoImprimir } from '@/components/BotaoImprimir';
import { inscricaoCompleta } from '@/lib/atleta/consultas';
import { podeVerInscricao } from '@/lib/auth/permissoes';
import { paraPermissao, usuarioAtual } from '@/lib/auth/sessao';
import { mascararCpf } from '@/lib/regras/cpf';
import { FUSO, formatarDataHora, formatarHora } from '@/lib/regras/datas';
import { formatarReais, nomeMotivo, type MotivoDesconto } from '@/lib/regras/preco';
import { TemaClube } from '@/components/TemaClube';
import { podeTransferir } from '@/lib/regras/transferencia';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Comprovante', robots: { index: false } };

const dataHora = (d: Date) => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, dateStyle: 'short', timeStyle: 'short' }).format(d);

export default async function Comprovante({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await usuarioAtual();
  if (!usuario) redirect(`/entrar?voltar=/inscricoes/${id}`);
  const dados = await inscricaoCompleta(id);
  if (!dados || !podeVerInscricao(paraPermissao(usuario), dados.inscricao, dados.pedido, dados.clube.id)) notFound();
  const { inscricao, evento, clube, pedido, distancia } = dados;
  const motivo = inscricao.motivoDesconto as MotivoDesconto;

  const linhas: Array<[string, string]> = [
    ['Participante', inscricao.nome],
    ['CPF', mascararCpf(inscricao.cpf)],
    ['Distância', distancia],
    ...(inscricao.categoria ? [['Categoria', inscricao.categoria] as [string, string]] : []),
    ...(inscricao.camisa ? [['Camisa', inscricao.camisa] as [string, string]] : []),
    ['Valor pago', `${formatarReais(inscricao.precoCentavos)}${motivo ? ` (${nomeMotivo(motivo, clube.nomePrecoEspecial)})` : ''}`],
    ...(pedido.pagoEm ? [['Pago em', dataHora(pedido.pagoEm)] as [string, string]] : []),
    ['Pedido', pedido.id.slice(0, 8).toUpperCase()],
  ];

  return (
    <TemaClube cor={clube.cor}>
    <div className="pagina">
      <Link href="/minhas-inscricoes" className="link text-sm print:hidden">← Minhas inscrições</Link>
      <section className="cartao">
        <span className="rotulo">{clube.nome} · comprovante de inscrição</span>
        <h1 className="titulo-2">{evento.nome}</h1>
        <p className="text-sm text-suave">{formatarDataHora(evento.dataHora)} · largada {formatarHora(evento.dataHora)} · {evento.local}</p>
        {inscricao.status === 'confirmada' ? (
          <div className="numero-peito">
            <span className="n num">{inscricao.numero}</span>
            <b>Inscrição confirmada</b>
            <span className="text-sm">Número de inscrição. O número de peito é entregue na retirada do kit.</span>
          </div>
        ) : (
          <p className={`selo ${inscricao.status === 'cancelada' ? 'selo-erro' : 'selo-alerta'} self-start`}>
            {inscricao.status === 'cancelada' ? 'Inscrição cancelada' : 'Aguardando pagamento'}
          </p>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {linhas.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-suave">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="dica">Leve um documento com foto na retirada do kit{motivo === 'meia60' ? ' (obrigatório para a meia 60+)' : ''}.</p>
      </section>
      {inscricao.status === 'confirmada' && <BotaoImprimir />}
      {podeTransferir(inscricao, evento.transferenciaAte, new Date()) && (
        <Link href={`/inscricoes/${inscricao.id}/transferir`} className="botao botao-borda w-full print:hidden">Transferir para outra pessoa</Link>
      )}
    </div>
    </TemaClube>
  );
}
