import Link from 'next/link';
import { podeAbrirPainel } from '@/lib/auth/permissoes';
import { paraPermissao, usuarioAtual } from '@/lib/auth/sessao';
import { sairAcao } from '@/app/acoes';

export async function Cabecalho() {
  const usuario = await usuarioAtual();
  return (
    <header className="border-b border-linha bg-white">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-display text-lg font-extrabold uppercase tracking-wide no-underline">
          Inscrições <span className="text-acao">Fast</span>
        </Link>
        {usuario ? (
          <form action={sairAcao} className="flex items-center gap-3 text-sm">
            <Link href="/minhas-inscricoes" className="link">Minhas inscrições</Link>
            {podeAbrirPainel(paraPermissao(usuario)) && <Link href="/painel" className="link">Painel</Link>}
            <Link href="/minha-conta" className="hidden max-w-[220px] truncate text-suave no-underline sm:inline" title="Meus dados">{usuario.email}</Link>
            <button type="submit" className="link">Sair</button>
          </form>
        ) : (
          <Link href="/entrar" className="link text-sm">Entrar</Link>
        )}
      </div>
    </header>
  );
}
