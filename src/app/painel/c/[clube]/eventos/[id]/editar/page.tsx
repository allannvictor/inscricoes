import { asc, count, eq } from 'drizzle-orm';
import { db } from '@/db';
import { distancias, inscricoes } from '@/db/schema';
import { enviarArquivoEventoAcao, removerArquivoEventoAcao } from '@/app/painel/acoes';
import { EnvioArquivo } from '@/components/painel/EnvioArquivo';
import { FormularioEvento } from '@/components/painel/FormularioEvento';
import { exigirEvento } from '@/lib/painel/acesso';
import { dataLocal } from '@/lib/regras/datas';
import { paraInputDataHora } from '@/lib/painel/evento-form';

export const metadata = { title: 'Editar evento', robots: { index: false } };

const reais = (c: number | null) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','));

export default async function EditarEvento({ params, searchParams }: { params: Promise<{ clube: string; id: string }>; searchParams: Promise<{ criado?: string }> }) {
  const { clube: slug, id } = await params;
  const { criado } = await searchParams;
  const { clube, evento } = await exigirEvento(slug, id);
  const lista = await db.select().from(distancias).where(eq(distancias.eventoId, evento.id)).orderBy(asc(distancias.ordem));
  const [{ total }] = await db.select({ total: count() }).from(inscricoes).where(eq(inscricoes.eventoId, evento.id));

  const enviarCapa = enviarArquivoEventoAcao.bind(null, evento.id, 'capa');
  const removerCapa = removerArquivoEventoAcao.bind(null, evento.id, 'capa');
  const enviarRegulamento = enviarArquivoEventoAcao.bind(null, evento.id, 'regulamento');
  const removerRegulamento = removerArquivoEventoAcao.bind(null, evento.id, 'regulamento');

  return (
    <div className="flex flex-col gap-4">
      {criado && (
        <div className="cartao border-ok bg-ok-fundo">
          <b>Evento criado como rascunho.</b>
          <span className="text-sm">Envie a imagem e o regulamento abaixo, confira tudo e clique em <b>Publicar</b> no topo quando quiser abrir as inscrições.</span>
        </div>
      )}
      <section className="cartao">
        <h2 className="titulo-3">Imagem e regulamento</h2>
        <EnvioArquivo
          id="capa"
          rotulo="Imagem do evento"
          tipo="imagem"
          previa="capa"
          atual={evento.capaUrl}
          dica="Formato deitado (16:9), por exemplo 1200 × 675. Aparece no topo da página e na prévia do link no WhatsApp."
          enviar={enviarCapa}
          remover={removerCapa}
        />
        <EnvioArquivo
          id="regulamento"
          rotulo="Regulamento (PDF)"
          tipo="pdf"
          atual={evento.regulamentoUrl}
          dica="PDF de até 4 MB. O atleta vê o link na página do evento e no aceite da inscrição."
          enviar={enviarRegulamento}
          remover={removerRegulamento}
        />
      </section>
      <FormularioEvento
        clubeId={clube.id}
        clubeSlug={clube.slug}
        eventoId={evento.id}
        temInscritos={total > 0}
        inicial={{
          nome: evento.nome,
          dataHora: paraInputDataHora(evento.dataHora),
          local: evento.local,
          descricao: evento.descricao ?? '',
          inscricoesAte: dataLocal(evento.inscricoesAte),
          transferenciaAte: evento.transferenciaAte ? dataLocal(evento.transferenciaAte) : '',
          precoSocioAtivo: evento.precoSocioAtivo,
          pedeCamisa: evento.pedeCamisa,
          usaCategoria: evento.usaCategoria,
          distancias: lista.map((d) => ({ id: d.id, nome: d.nome, preco: reais(d.precoCentavos), precoSocio: reais(d.precoSocioCentavos), vagas: d.vagas == null ? '' : String(d.vagas) })),
        }}
      />
    </div>
  );
}
