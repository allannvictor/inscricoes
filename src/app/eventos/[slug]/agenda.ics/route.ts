import { gerarIcs } from '@/lib/agenda';
import { eventoPorSlug } from '@/lib/pedidos/consultas';

/** "Adicionar à agenda": arquivo .ics do evento (só eventos publicados ou encerrados). */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = await eventoPorSlug(slug);
  if (!dados) return new Response('Evento não encontrado', { status: 404 });
  const { evento } = dados;
  const url = `${process.env.APP_URL ?? ''}/eventos/${evento.slug}`;
  return new Response(gerarIcs({ id: evento.id, nome: evento.nome, inicio: evento.dataHora, local: evento.local, url }), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${evento.slug}.ics"`,
    },
  });
}
