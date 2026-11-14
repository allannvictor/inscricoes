import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormularioNovoClube } from '@/components/painel/FormularioNovoClube';
import { exigirPainel } from '@/lib/painel/acesso';

export const metadata = { title: 'Novo clube', robots: { index: false } };

/** Só o master cria clubes. */
export default async function NovoClube() {
  const usuario = await exigirPainel('/painel/clubes/novo');
  if (!usuario.admin) notFound();
  return (
    <div className="painel max-w-[760px]">
      <Link href="/painel" className="link text-sm">← Clubes</Link>
      <h1 className="titulo-2">Novo clube</h1>
      <section className="cartao">
        <FormularioNovoClube />
      </section>
    </div>
  );
}
