import Link from 'next/link';
import { redirect } from 'next/navigation';
import { minhasInscricoes, type MinhaInscricao } from '@/lib/atleta/consultas';
import { usuarioAtual } from '@/lib/auth/sessao';
import { formatarDataHora, FUSO } from '@/lib/regras/datas';
import { podeTransferir } from '@/lib/regras/transferencia';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minhas inscrições', robots: { index: false } };

const SELO: Record<string, { texto: string; classe: string }> = {
  confirmada: { texto: 'Confirmada', classe: 'selo-ok' },
  pendente: { texto: 'Aguardando Pix', classe: 'selo-alerta' },
  cancelada: { texto: 'Cancelada', classe: 'selo-erro' },
};

function dia(d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: 'short' }).formatToParts(d).map((x) => [x.type, x.value]));
  return { d: p.day, m: (p.month ?? '').replace('.', '') };
}

export default async function MinhasInscricoes() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect('/entrar?voltar=/minhas-inscricoes');
  const lista = await minhasInscricoes(usuario);
  const agora = new Date();
  const proximas = lista.filter((l) => l.evento.dataHora >= agora);
  const anteriores = lista.filter((l) => l.evento.dataHora < agora).reverse();

  const cartao = (l: MinhaInscricao) => {
    const selo = SELO[l.inscricao.status] ?? SELO.cancelada;
    const { d, m } = dia(l.evento.dataHora);
    const comprei = l.pedido.compradorId === usuario.id;
    const transferivel = podeTransferir(l.inscricao, l.evento.transferenciaAte, agora);
    return (
      <section key={l.inscricao.id} className="cartao">
        <div className="grid grid-cols-[auto_1fr] items-start gap-3">
          <div className="rounded-xl border border-linha bg-fundo2 px-2.5 py-1.5 text-center font-display leading-none">
            <b className="block text-2xl font-extrabold">{d}</b>
            <span className="text-xs uppercase tracking-wider">{m}</span>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/eventos/${l.evento.slug}`} className="titulo-3 no-underline">{l.evento.nome}</Link>
              <span className={`selo ${selo.classe}`}>{selo.texto}</span>
            </div>
            <p className="text-sm">
              <b>{l.inscricao.nome}</b> · {l.distancia}
              {l.inscricao.numero ? <> · nº <span className="num">{l.inscricao.numero}</span></> : null}
            </p>
            <p className="text-xs text-suave">{l.clube} · {formatarDataHora(l.evento.dataHora)}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {l.inscricao.status === 'confirmada' && (
                <Link href={`/inscricoes/${l.inscricao.id}`} className="botao botao-borda botao-pequeno">Comprovante</Link>
              )}
              {transferivel && (
                <Link href={`/inscricoes/${l.inscricao.id}/transferir`} className="botao botao-borda botao-pequeno">Transferir</Link>
              )}
              {l.inscricao.status === 'pendente' && comprei && (
                <Link href={`/pedidos/${l.pedido.id}`} className="botao botao-primario botao-pequeno">Pagar com Pix</Link>
              )}
            </div>
            {l.inscricao.status === 'pendente' && !comprei && <p className="dica">Aguardando o pagamento de quem fez a inscrição.</p>}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="pagina">
      <div className="flex items-center justify-between gap-2">
        <h1 className="titulo-2">Minhas inscrições</h1>
        <Link href="/minha-conta" className="link text-sm">Meus dados</Link>
      </div>
      {lista.length === 0 && (
        <div className="cartao">
          <p>Você ainda não tem inscrições com este e-mail ({usuario.email}).</p>
          <p className="text-sm text-suave">Se alguém te inscreveu, peça para usar o seu e-mail ou CPF na inscrição. Inscrições feitas no seu CPF aparecem aqui depois que você preencher o CPF em Meus dados.</p>
          <Link href="/" className="botao botao-borda self-start">Ver eventos</Link>
        </div>
      )}
      {proximas.length > 0 && <span className="rotulo">Próximas</span>}
      {proximas.map(cartao)}
      {anteriores.length > 0 && <span className="rotulo">Anteriores</span>}
      {anteriores.map(cartao)}
    </div>
  );
}
