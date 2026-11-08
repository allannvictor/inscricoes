import Link from 'next/link';
import { eventosAbertos } from '@/lib/pedidos/consultas';
import { formatarDataHora } from '@/lib/regras/datas';

export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const lista = await eventosAbertos();
  return (
    <div className="pagina">
      <h1 className="titulo-2">Próximos eventos</h1>
      {lista.length === 0 && <p className="text-suave">Nenhum evento com inscrições abertas agora.</p>}
      {lista.map(({ evento, clube }) => (
        <Link key={evento.id} href={`/eventos/${evento.slug}`} className="cartao no-underline">
          <span className="rotulo">{clube.nome}</span>
          <span className="titulo-3">{evento.nome}</span>
          <span className="text-sm text-suave">
            {formatarDataHora(evento.dataHora)} · {evento.local}
          </span>
        </Link>
      ))}
    </div>
  );
}
