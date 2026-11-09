import Link from 'next/link';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { eventos } from '@/db/schema';
import { BotaoDuplicar, CopiarLink, SeloStatus } from '@/components/painel/AcoesEvento';
import { exigirClube } from '@/lib/painel/acesso';
import { formatarDataHora } from '@/lib/regras/datas';
import { formatarReais } from '@/lib/regras/preco';

export const metadata = { title: 'Eventos', robots: { index: false } };

export default async function EventosDoClube({ params }: { params: Promise<{ clube: string }> }) {
  const { clube } = await exigirClube((await params).clube);
  const lista = await db
    .select({
      evento: eventos,
      confirmados: sql<number>`(select count(*) from inscricoes i where i.evento_id = "eventos"."id" and i.status = 'confirmada')`.mapWith(Number),
      pendentes: sql<number>`(select count(*) from inscricoes i join pedidos p on p.id = i.pedido_id where i.evento_id = "eventos"."id" and i.status = 'pendente' and p.expira_em > now())`.mapWith(Number),
      recebido: sql<number>`(select coalesce(sum(p.total_centavos), 0) from pedidos p where p.evento_id = "eventos"."id" and p.status = 'pago')`.mapWith(Number),
    })
    .from(eventos)
    .where(eq(eventos.clubeId, clube.id))
    .orderBy(desc(eventos.dataHora));
  const base = `/painel/c/${clube.slug}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="titulo-3">Eventos</h2>
        <Link href={`${base}/eventos/novo`} className="botao botao-primario botao-pequeno">+ Novo evento</Link>
      </div>
      {lista.length === 0 && (
        <div className="cartao">
          <p>Nenhum evento ainda. Crie o primeiro: ele começa como rascunho e só aparece para os atletas quando você publicar.</p>
        </div>
      )}
      {lista.map(({ evento, confirmados, pendentes, recebido }) => (
        <section key={evento.id} className="cartao gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`${base}/eventos/${evento.id}`} className="titulo-3 no-underline">{evento.nome}</Link>
              <SeloStatus status={evento.status} />
            </div>
            <span className="text-sm text-suave">{formatarDataHora(evento.dataHora)} · {evento.local}</span>
            <span className="num text-sm">
              <b>{confirmados}</b> confirmados · {pendentes} aguardando Pix · <b>{formatarReais(recebido)}</b> recebidos
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`${base}/eventos/${evento.id}`} className="botao botao-borda botao-pequeno">Inscritos</Link>
            <Link href={`${base}/eventos/${evento.id}/editar`} className="botao botao-borda botao-pequeno">Editar</Link>
            {evento.status === 'publicado' && <CopiarLink caminho={`/eventos/${evento.slug}`} />}
            <BotaoDuplicar eventoId={evento.id} clubeSlug={clube.slug} />
          </div>
        </section>
      ))}
    </>
  );
}
