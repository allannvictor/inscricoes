import Link from 'next/link';
import { usuarioAtual } from '@/lib/auth/sessao';
import { sairAcao } from '@/app/acoes';

export async function Cabecalho() {
  const usuario = await usuarioAtual();
  return (
    <header className="border-b border-linha">
      <div className="mx-auto flex max-w-[440px] items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-display text-lg font-extrabold uppercase tracking-wide no-underline">
          Inscrições
        </Link>
        {usuario ? (
          <form action={sairAcao} className="flex items-center gap-3 text-sm">
            <span className="max-w-[180px] truncate text-suave">{usuario.email}</span>
            <button type="submit" className="link">Sair</button>
          </form>
        ) : (
          <Link href="/entrar" className="link text-sm">Entrar</Link>
        )}
      </div>
    </header>
  );
}
