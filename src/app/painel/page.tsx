import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Avatar } from '@/components/Capa';
import { clubesDoUsuario, exigirPainel } from '@/lib/painel/acesso';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Painel', robots: { index: false } };

export default async function Painel() {
  const usuario = await exigirPainel();
  const lista = await clubesDoUsuario(usuario);
  if (lista.length === 1 && !usuario.admin) redirect(`/painel/c/${lista[0].slug}`);
  return (
    <div className="painel">
      <div>
        <span className="rotulo">{usuario.admin ? 'Acesso master' : 'Seus clubes'}</span>
        <h1 className="titulo-2">Escolha o clube</h1>
      </div>
      {lista.length === 0 && <p className="text-suave">Nenhum clube cadastrado.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((c) => (
          <Link key={c.id} href={`/painel/c/${c.slug}`} className="cartao flex-row items-center no-underline">
            <Avatar src={c.fotoUrl} nome={c.nome} />
            <b>{c.nome}</b>
          </Link>
        ))}
      </div>
    </div>
  );
}
