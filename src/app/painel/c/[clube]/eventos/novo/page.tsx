import Link from 'next/link';
import { FormularioEvento } from '@/components/painel/FormularioEvento';
import { exigirClube } from '@/lib/painel/acesso';

export const metadata = { title: 'Novo evento', robots: { index: false } };

export default async function NovoEvento({ params }: { params: Promise<{ clube: string }> }) {
  const { clube } = await exigirClube((await params).clube);
  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/painel/c/${clube.slug}`} className="link">Eventos</Link>
        <span className="text-suave">›</span>
        <b>Novo evento</b>
      </div>
      <FormularioEvento
        clubeId={clube.id}
        clubeSlug={clube.slug}
        eventoId={null}
        inicial={{
          nome: '',
          dataHora: '',
          local: '',
          descricao: '',
          inscricoesAte: '',
          transferenciaAte: '',
          precoSocioAtivo: false,
          pedeCamisa: true,
          usaCategoria: true,
          distancias: [{ nome: '', preco: '', precoSocio: '', vagas: '' }],
        }}
      />
    </>
  );
}
