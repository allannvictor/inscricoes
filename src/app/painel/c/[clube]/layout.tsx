import Link from 'next/link';
import { Avatar } from '@/components/Capa';
import { Abas } from '@/components/painel/Abas';
import { exigirClube } from '@/lib/painel/acesso';

export const dynamic = 'force-dynamic';

export default async function LayoutClube({ children, params }: { children: React.ReactNode; params: Promise<{ clube: string }> }) {
  const { clube: slug } = await params;
  const { usuario, clube } = await exigirClube(slug);
  const base = `/painel/c/${clube.slug}`;
  return (
    <div className="painel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={clube.fotoUrl} nome={clube.nome} />
          <div>
            <span className="rotulo">{usuario.admin ? 'Painel · acesso master' : 'Painel do organizador'}</span>
            <h1 className="titulo-2">{clube.nome}</h1>
          </div>
        </div>
        {usuario.admin && <Link href="/painel" className="link text-sm">Trocar de clube</Link>}
      </div>
      <Abas
        rotulo="Seções do painel"
        itens={[
          { href: base, texto: 'Eventos' },
          { href: `${base}/socios`, texto: 'Sócios' },
          { href: `${base}/perfil`, texto: 'Perfil do clube' },
          { href: `${base}/pagamento`, texto: 'Pagamento' },
        ]}
      />
      {children}
    </div>
  );
}
