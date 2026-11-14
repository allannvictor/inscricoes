import { count, eq, inArray } from 'drizzle-orm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Avatar } from '@/components/Capa';
import { db } from '@/db';
import { eventos, organizadores } from '@/db/schema';
import { clubesDoUsuario, exigirPainel } from '@/lib/painel/acesso';
import { situacaoDoPagamento, type SituacaoPagamento } from '@/lib/pagamento';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Painel', robots: { index: false } };

const SELO_PAGAMENTO: Record<SituacaoPagamento, { texto: string; classe: string }> = {
  conectado: { texto: 'Mercado Pago conectado', classe: 'selo-ok' },
  ambiente: { texto: 'Conta do site', classe: 'selo-ok' },
  simulado: { texto: 'Pix simulado', classe: 'selo-alerta' },
  'nao-configurado': { texto: 'Sem Mercado Pago', classe: 'selo-erro' },
};

export default async function Painel() {
  const usuario = await exigirPainel();
  const lista = await clubesDoUsuario(usuario);
  if (lista.length === 1 && !usuario.admin) redirect(`/painel/c/${lista[0].slug}`);

  // Master: contagens para a lista de clubes.
  const ids = lista.map((c) => c.id);
  const [orgs, publicados] = usuario.admin && ids.length
    ? await Promise.all([
        db.select({ clubeId: organizadores.clubeId, n: count() }).from(organizadores).where(inArray(organizadores.clubeId, ids)).groupBy(organizadores.clubeId),
        db.select({ clubeId: eventos.clubeId, n: count() }).from(eventos).where(eq(eventos.status, 'publicado')).groupBy(eventos.clubeId),
      ])
    : [[], []];
  const nOrg = new Map(orgs.map((o) => [o.clubeId, o.n]));
  const nPub = new Map(publicados.map((o) => [o.clubeId, o.n]));

  return (
    <div className="painel">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="rotulo">{usuario.admin ? 'Acesso master' : 'Seus clubes'}</span>
          <h1 className="titulo-2">{usuario.admin ? 'Clubes' : 'Escolha o clube'}</h1>
        </div>
        {usuario.admin && <Link href="/painel/clubes/novo" className="botao botao-primario">+ Novo clube</Link>}
      </div>
      {lista.length === 0 && <p className="text-suave">Nenhum clube cadastrado.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((c) => {
          const selo = SELO_PAGAMENTO[situacaoDoPagamento(c)];
          return (
            <Link key={c.id} href={`/painel/c/${c.slug}`} className="cartao gap-2 no-underline">
              <span className="flex items-center gap-3">
                <Avatar src={c.fotoUrl} nome={c.nome} />
                <b>{c.nome}</b>
              </span>
              {usuario.admin && (
                <span className="flex flex-wrap items-center gap-1.5 text-sm text-suave">
                  <span className={`selo ${selo.classe}`}>{selo.texto}</span>
                  <span>{nOrg.get(c.id) ?? 0} organizador(es)</span>·<span>{nPub.get(c.id) ?? 0} evento(s) publicado(s)</span>
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
