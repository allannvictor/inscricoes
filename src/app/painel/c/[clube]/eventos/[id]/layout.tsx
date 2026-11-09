import Link from 'next/link';
import { Abas } from '@/components/painel/Abas';
import { BotoesStatus, CopiarLink, SeloStatus } from '@/components/painel/AcoesEvento';
import { exigirEvento } from '@/lib/painel/acesso';
import { formatarDataHora } from '@/lib/regras/datas';

export default async function LayoutEvento({ children, params }: { children: React.ReactNode; params: Promise<{ clube: string; id: string }> }) {
  const { clube: slug, id } = await params;
  const { clube, evento } = await exigirEvento(slug, id);
  const base = `/painel/c/${clube.slug}/eventos/${evento.id}`;
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href={`/painel/c/${clube.slug}`} className="link">Eventos</Link>
          <span className="text-suave">›</span>
          <b>{evento.nome}</b>
          <SeloStatus status={evento.status} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-suave">{formatarDataHora(evento.dataHora)} · {evento.local}</span>
          <div className="flex flex-wrap items-center gap-2">
            <BotoesStatus eventoId={evento.id} status={evento.status} />
            <Link href={`/eventos/${evento.slug}`} target="_blank" className="botao botao-borda botao-pequeno">Ver página</Link>
            <CopiarLink caminho={`/eventos/${evento.slug}`} />
          </div>
        </div>
      </div>
      <Abas
        rotulo="Seções do evento"
        itens={[
          { href: base, texto: 'Inscritos', exato: true },
          { href: `${base}/editar`, texto: 'Editar' },
          { href: `${base}/cupons`, texto: 'Cupons' },
        ]}
      />
      {children}
    </>
  );
}
