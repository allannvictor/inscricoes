import Link from 'next/link';
import { podeAbrirPainel } from '@/lib/auth/permissoes';
import { paraPermissao, usuarioAtual } from '@/lib/auth/sessao';
import { sairAcao } from '@/app/acoes';

export async function Cabecalho() {
  const usuario = await usuarioAtual();
  return (
    <header className="border-b border-linha bg-white">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="shrink-0 whitespace-nowrap font-display text-lg font-extrabold uppercase tracking-wide no-underline">
          Inscrições <span className="text-acao">Fast</span>
        </Link>
        {usuario ? (
          <form action={sairAcao} className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm">
            <Link href="/minhas-inscricoes" className="link">Minhas inscrições</Link>
            {podeAbrirPainel(paraPermissao(usuario)) && <Link href="/painel" className="link">Painel</Link>}
            {/* Botão "Minha conta" no lugar do e-mail (pedido do Allan, 14/11/2026); o e-mail aparece ao passar o mouse. */}
            <Link href="/minha-conta" className="botao botao-borda botao-pequeno" title={`Meus dados · ${usuario.email}`}>Minha conta</Link>
            <button type="submit" className="link">Sair</button>
          </form>
        ) : (
          <Link href="/entrar" className="link text-sm">Entrar</Link>
        )}
      </div>
    </header>
  );
}
