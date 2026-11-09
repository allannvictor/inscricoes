import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { socios } from '@/db/schema';
import { BotaoRemoverSocio, ImportarSocios } from '@/components/painel/ImportarSocios';
import { exigirClube } from '@/lib/painel/acesso';
import { formatarCpf } from '@/lib/regras/cpf';

export const metadata = { title: 'Sócios', robots: { index: false } };

export default async function Socios({ params }: { params: Promise<{ clube: string }> }) {
  const { clube } = await exigirClube((await params).clube);
  const lista = await db.select().from(socios).where(eq(socios.clubeId, clube.id)).orderBy(asc(socios.nome), asc(socios.cpf));
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="flex flex-col gap-3">
        <ImportarSocios clubeId={clube.id} total={lista.length} />
        <p className="dica">Quem está nesta lista paga o preço de sócio nos eventos que têm preço de sócio ligado. A lista vale para todos os eventos do clube.</p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="rotulo">{lista.length} sócios</span>
        <div className="tabela-wrap max-h-[640px] overflow-y-auto">
          <table className="tabela">
            <thead><tr><th>CPF</th><th>Nome</th><th /></tr></thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={3} className="text-suave">Nenhum sócio cadastrado.</td></tr>}
              {lista.map((s) => (
                <tr key={s.cpf}>
                  <td className="num">{formatarCpf(s.cpf)}</td>
                  <td>{s.nome ?? '—'}</td>
                  <td><BotaoRemoverSocio clubeId={clube.id} cpf={s.cpf} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
