'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Abas do painel. A aba ativa é a de caminho mais longo que combina com a página atual. */
export function Abas({ itens, rotulo }: { itens: Array<{ href: string; texto: string; exato?: boolean }>; rotulo: string }) {
  const caminho = usePathname();
  const ativo = itens
    .filter((i) => (i.exato ? caminho === i.href : caminho === i.href || caminho.startsWith(i.href + '/')))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className="abas" aria-label={rotulo}>
      {itens.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.href === ativo ? 'page' : undefined}>
          {i.texto}
        </Link>
      ))}
    </nav>
  );
}
