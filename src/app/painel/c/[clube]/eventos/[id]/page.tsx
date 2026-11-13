import Link from 'next/link';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { distancias, pedidos } from '@/db/schema';
import { BotaoCancelarInscricao } from '@/components/painel/BotaoCancelarInscricao';
import { exigirEvento } from '@/lib/painel/acesso';
import { listarInscritos, statusVisivel } from '@/lib/painel/inscritos';
import { formatarCpf } from '@/lib/regras/cpf';
import { NOME_MOTIVO, formatarReais, type MotivoDesconto } from '@/lib/regras/preco';

export const metadata = { title: 'Inscritos', robots: { index: false } };

const TAMANHOS = ['PP', 'P', 'M', 'G', 'GG', 'XG'];
const SELO: Record<string, { texto: string; classe: string }> = {
  confirmada: { texto: 'Paga', classe: 'selo-ok' },
  pendente: { texto: 'Aguardando Pix', classe: 'selo-alerta' },
  cancelada: { texto: 'Cancelada', classe: 'selo-erro' },
  expirada: { texto: 'Pix expirado', classe: 'selo-neutro' },
};

export default async function Inscritos({
  params,
  searchParams,
}: {
  params: Promise<{ clube: string; id: string }>;
  searchParams: Promise<{ busca?: string; distancia?: string; status?: string }>;
}) {
  const { clube: slug, id } = await params;
  const filtros = await searchParams;
  const { clube, evento } = await exigirEvento(slug, id);

  const listaDistancias = await db.select().from(distancias).where(eq(distancias.eventoId, evento.id)).orderBy(asc(distancias.ordem));
  const todas = await listarInscritos(evento.id, { status: 'todas' });
  const confirmadas = todas.filter((l) => statusVisivel(l) === 'confirmada');
  const pendentes = todas.filter((l) => statusVisivel(l) === 'pendente');
  const [{ recebido }] = await db
    .select({ recebido: sql<number>`coalesce(sum(${pedidos.totalCentavos}), 0)`.mapWith(Number) })
    .from(pedidos)
    .where(and(eq(pedidos.eventoId, evento.id), eq(pedidos.status, 'pago')));
  const [{ conflitos }] = await db
    .select({ conflitos: sql<number>`count(*)`.mapWith(Number) })
    .from(pedidos)
    .where(and(eq(pedidos.eventoId, evento.id), eq(pedidos.status, 'pago_conflito')));

  const linhas = await listarInscritos(evento.id, { busca: filtros.busca, distanciaId: filtros.distancia, status: filtros.status });
  const visiveis = filtros.status === 'pendente' ? linhas.filter((l) => statusVisivel(l) === 'pendente') : linhas;
  const base = `/painel/c/${clube.slug}/eventos/${evento.id}`;
  const maxCamisa = Math.max(1, ...TAMANHOS.map((t) => confirmadas.filter((l) => l.inscricao.camisa === t).length));

  return (
    <div className="flex flex-col gap-4">
      {conflitos > 0 && (
        <div className="erros">
          <b>{conflitos} pagamento(s) precisam de atenção:</b> o Pix caiu depois do prazo e a vaga já tinha sido ocupada pelo mesmo CPF. Fale com o comprador e, se for o caso, devolva o valor pelo Mercado Pago.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="cartao gap-1"><span className="rotulo">Confirmados</span><span className="numero-grande num">{confirmadas.length}</span></div>
        <div className="cartao gap-1"><span className="rotulo">Aguardando Pix</span><span className="numero-grande num">{pendentes.length}</span><span className="dica">liberam em até 30 min</span></div>
        <div className="cartao gap-1"><span className="rotulo">Recebido</span><span className="numero-grande num">{formatarReais(recebido)}</span><span className="dica">antes da taxa do Mercado Pago</span></div>
        <div className="cartao gap-1">
          <span className="rotulo">Com desconto</span>
          <span className="numero-grande num">{confirmadas.filter((l) => l.inscricao.motivoDesconto).length}</span>
          <span className="dica num">
            {confirmadas.filter((l) => l.inscricao.motivoDesconto === 'socio').length} sócio · {confirmadas.filter((l) => l.inscricao.motivoDesconto === 'meia60').length} meia 60+ · {confirmadas.filter((l) => l.inscricao.motivoDesconto === 'cupom').length} cupom
          </span>
        </div>
      </div>

      <div className={`grid gap-3 ${evento.pedeCamisa ? 'md:grid-cols-2' : ''}`}>
        <section className="cartao">
          <h3 className="titulo-3">Por distância</h3>
          {listaDistancias.map((d) => {
            const n = confirmadas.filter((l) => l.inscricao.distanciaId === d.id).length;
            const p = pendentes.filter((l) => l.inscricao.distanciaId === d.id).length;
            return (
              <div key={d.id} className="grid grid-cols-[80px_1fr_auto] items-center gap-3 text-sm">
                <span>{d.nome}</span>
                <span className="barra"><i style={{ width: `${d.vagas ? Math.min(100, ((n + p) / d.vagas) * 100) : confirmadas.length ? (n / confirmadas.length) * 100 : 0}%` }} /></span>
                <span className="num text-right">{n}{p ? ` (+${p})` : ''}{d.vagas ? ` / ${d.vagas}` : ''}</span>
              </div>
            );
          })}
          <span className="dica">Confirmados (+ aguardando Pix) / limite de vagas.</span>
        </section>
        {evento.pedeCamisa && (
          <section className="cartao">
            <h3 className="titulo-3">Camisas (confirmados)</h3>
            {TAMANHOS.map((t) => {
              const n = confirmadas.filter((l) => l.inscricao.camisa === t).length;
              return (
                <div key={t} className="grid grid-cols-[80px_1fr_auto] items-center gap-3 text-sm">
                  <span>{t}</span>
                  <span className="barra"><i style={{ width: `${(n / maxCamisa) * 100}%` }} /></span>
                  <span className="num text-right">{n}</span>
                </div>
              );
            })}
          </section>
        )}
      </div>

      <form className="flex flex-wrap items-end gap-2" action={base}>
        <div className="campo min-w-[220px] flex-1">
          <label htmlFor="busca">Buscar</label>
          <input id="busca" name="busca" className="entrada" placeholder="Nome, CPF ou nº" defaultValue={filtros.busca ?? ''} />
        </div>
        <div className="campo">
          <label htmlFor="distancia">Distância</label>
          <select id="distancia" name="distancia" className="entrada" defaultValue={filtros.distancia ?? ''}>
            <option value="">Todas</option>
            {listaDistancias.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="status">Situação</label>
          <select id="status" name="status" className="entrada" defaultValue={filtros.status ?? 'ativas'}>
            <option value="ativas">Pagas, aguardando e canceladas</option>
            <option value="confirmada">Pagas</option>
            <option value="pendente">Aguardando Pix</option>
            <option value="cancelada">Canceladas</option>
            <option value="expirada">Pix expirado</option>
            <option value="todas">Todas</option>
          </select>
        </div>
        <button className="botao botao-borda">Filtrar</button>
        <a className="botao botao-primario" href={`${base}/planilha`}>Baixar planilha</a>
      </form>

      <div className="tabela-wrap">
        <table className="tabela">
          <thead>
            <tr>
              <th>Nº</th><th>Nome</th><th>CPF</th><th>Distância</th>
              {evento.usaCategoria && <th>Categoria</th>}
              {evento.pedeCamisa && <th>Camisa</th>}
              <th>Valor</th><th>Situação</th><th>WhatsApp</th><th />
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr><td colSpan={10} className="text-suave">Nenhuma inscrição com esses filtros.</td></tr>
            )}
            {visiveis.map((l) => {
              const st = statusVisivel(l);
              const selo = SELO[st] ?? SELO.cancelada;
              const motivo = l.inscricao.motivoDesconto as MotivoDesconto;
              return (
                <tr key={l.inscricao.id}>
                  <td className="num">{l.inscricao.numero ?? '—'}</td>
                  <td>
                    <b>{l.inscricao.nome}</b>
                    {motivo && <span className="selo selo-neutro ml-1.5">{NOME_MOTIVO[motivo]}</span>}
                    {l.transferidaDe && <div className="text-xs text-suave">transferida de {l.transferidaDe}</div>}
                  </td>
                  <td className="num">{formatarCpf(l.inscricao.cpf)}</td>
                  <td>{l.distancia}</td>
                  {evento.usaCategoria && <td>{l.inscricao.categoria ?? '—'}</td>}
                  {evento.pedeCamisa && <td>{l.inscricao.camisa ?? '—'}</td>}
                  <td className="num">{formatarReais(l.inscricao.precoCentavos)}</td>
                  <td><span className={`selo ${selo.classe}`}>{selo.texto}</span></td>
                  <td className="num">{l.inscricao.telefone ?? '—'}</td>
                  <td>{(st === 'confirmada' || st === 'pendente') && <BotaoCancelarInscricao inscricaoId={l.inscricao.id} nome={l.inscricao.nome} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="dica">
        Cancelar libera a vaga, mas não devolve o dinheiro: se precisar, faça o reembolso pelo Mercado Pago. A planilha traz todos os dados (e-mail, nascimento, contato de emergência).
        {filtros.busca || filtros.distancia || (filtros.status && filtros.status !== 'ativas') ? <> <Link className="link" href={base}>Limpar filtros</Link></> : null}
      </p>
    </div>
  );
}
