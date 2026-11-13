import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { cupons } from '@/db/schema';
import { BotaoAlternarCupom, FormularioCupom } from '@/components/painel/FormularioCupom';
import { exigirEvento } from '@/lib/painel/acesso';
import { formatarReais } from '@/lib/regras/preco';

export const metadata = { title: 'Cupons', robots: { index: false } };

export default async function Cupons({ params }: { params: Promise<{ clube: string; id: string }> }) {
  const { clube, id } = await params;
  const { evento } = await exigirEvento(clube, id);
  const lista = await db
    .select({
      cupom: cupons,
      usos: sql<number>`(select count(*) from pedidos p where p.cupom_id = "cupons"."id" and p.status in ('pendente', 'pago'))`.mapWith(Number),
    })
    .from(cupons)
    .where(eq(cupons.eventoId, evento.id))
    .orderBy(asc(cupons.codigo));
  return (
    <div className="flex flex-col gap-4">
      <FormularioCupom eventoId={evento.id} />
      <div className="tabela-wrap">
        <table className="tabela">
          <thead><tr><th>Código</th><th>Desconto</th><th>Usos</th><th>Situação</th><th /></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={5} className="text-suave">Nenhum cupom neste evento.</td></tr>}
            {lista.map(({ cupom, usos }) => (
              <tr key={cupom.id}>
                <td><b>{cupom.codigo}</b></td>
                <td>{cupom.tipo === 'percentual' ? `${cupom.valor}%` : formatarReais(cupom.valor)}</td>
                <td className="num">{usos}{cupom.limite != null ? ` de ${cupom.limite}` : ''}</td>
                <td>{cupom.ativo ? <span className="selo selo-ok">Ativo</span> : <span className="selo selo-neutro">Desativado</span>}</td>
                <td><BotaoAlternarCupom cupomId={cupom.id} ativo={cupom.ativo} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
