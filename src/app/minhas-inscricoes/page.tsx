import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ABA_VAZIA, ABAS, abaValida, NOME_ABA, separarEmAbas, type Aba, type GrupoProva } from '@/lib/atleta/abas';
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

export default async function MinhasInscricoes({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect('/entrar?voltar=/minhas-inscricoes');
  const aba = abaValida((await searchParams).aba);
  const lista = await minhasInscricoes(usuario);
  const agora = new Date();
  const abas = separarEmAbas(lista, agora);

  /** Uma linha por participante dentro do cartão da prova. */
  const participante = (l: MinhaInscricao, mostrarPagar: boolean) => {
    const selo = SELO[l.inscricao.status] ?? SELO.cancelada;
    const comprei = l.pedido.compradorId === usuario.id;
    const transferivel = aba === 'inscrito' && podeTransferir({ ...l.inscricao, transferida: l.transferida }, l.evento.transferenciaAte, agora);
    return (
      <section key={l.inscricao.id} aria-label={l.inscricao.nome} className="flex flex-col gap-1.5 border-t border-linha pt-3 first:border-t-0 first:pt-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            <b>{l.inscricao.nome}</b> · {l.distancia}
            {l.inscricao.numero ? <> · nº <span className="num">{l.inscricao.numero}</span></> : null}
          </p>
          <span className={`selo ${selo.classe}`}>{selo.texto}</span>
        </div>
        {aba !== 'cancelados' && (
          <div className="flex flex-wrap gap-2">
            {l.inscricao.status === 'pendente' && comprei && mostrarPagar && (
              <Link href={`/pedidos/${l.pedido.id}`} className="botao botao-primario botao-pequeno">Pagar com Pix</Link>
            )}
            {l.inscricao.status === 'confirmada' && (
              <Link href={`/inscricoes/${l.inscricao.id}`} className="botao botao-borda botao-pequeno">Comprovante</Link>
            )}
            {transferivel && (
              <Link href={`/inscricoes/${l.inscricao.id}/transferir`} className="botao botao-borda botao-pequeno">Transferir</Link>
            )}
          </div>
        )}
        {l.inscricao.status === 'pendente' && !comprei && <p className="dica">Aguardando o pagamento de quem fez a inscrição.</p>}
      </section>
    );
  };

  /** Um cartão por prova, com os participantes dentro. */
  const prova = (g: GrupoProva<MinhaInscricao>) => {
    const { d, m } = dia(g.evento.dataHora);
    const primeiro = g.itens[0];
    const pedidosComPagar = new Set<string>(); // "Pagar com Pix" uma vez por pedido
    return (
      <article key={g.evento.id} className={`cartao ${aba === 'cancelados' ? 'opacity-70' : ''}`}>
        <div className="grid grid-cols-[auto_1fr] items-center gap-3">
          <div className="rounded-xl border border-linha bg-fundo2 px-2.5 py-1.5 text-center font-display leading-none">
            <b className="block text-2xl font-extrabold">{d}</b>
            <span className="text-xs uppercase tracking-wider">{m}</span>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link href={`/eventos/${g.evento.slug}`} className="titulo-3 no-underline">{g.evento.nome}</Link>
            <p className="text-xs text-suave">{primeiro.clube} · {formatarDataHora(g.evento.dataHora)}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {g.itens.map((l) => {
            const mostrarPagar = !pedidosComPagar.has(l.pedido.id);
            if (l.inscricao.status === 'pendente') pedidosComPagar.add(l.pedido.id);
            return participante(l, mostrarPagar);
          })}
        </div>
      </article>
    );
  };

  const contar = (a: Aba) => abas[a].reduce((s, g) => s + g.itens.length, 0);

  return (
    <div className="pagina">
      <div className="flex items-center justify-between gap-2">
        <h1 className="titulo-2">Minhas inscrições</h1>
        <Link href="/minha-conta" className="link text-sm">Meus dados</Link>
      </div>
      {lista.length === 0 ? (
        <div className="cartao">
          <p>Você ainda não tem inscrições com este e-mail ({usuario.email}).</p>
          <p className="text-sm text-suave">Se alguém te inscreveu, a inscrição aparece aqui quando essa pessoa informa o seu e-mail nos seus dados de participante. Se não informou, peça para ela corrigir com a organização.</p>
          <Link href="/" className="botao botao-borda self-start">Ver eventos</Link>
        </div>
      ) : (
        <>
          <nav className="abas grid grid-cols-3" aria-label="Situação das inscrições">
            {ABAS.map((a) => (
              <Link
                key={a}
                href={a === 'inscrito' ? '/minhas-inscricoes' : `/minhas-inscricoes?aba=${a}`}
                aria-current={a === aba ? 'page' : undefined}
                className="flex flex-col items-center gap-0.5 !whitespace-normal text-center text-sm leading-tight"
              >
                <span>{NOME_ABA[a]}</span>
                <span className="text-xs font-normal">{contar(a)}</span>
              </Link>
            ))}
          </nav>
          {abas[aba].length === 0 ? <p className="text-sm text-suave">{ABA_VAZIA[aba]}</p> : abas[aba].map(prova)}
        </>
      )}
    </div>
  );
}
