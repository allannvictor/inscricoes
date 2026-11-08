import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_ACESSO, PAGINA_EM_BREVE, decidirAcesso } from '@/lib/pre-lancamento';

/** Modo "em breve": veja src/lib/pre-lancamento.ts. */
export function middleware(req: NextRequest) {
  const chave = process.env.CHAVE_PRE_LANCAMENTO;
  const decisao = decidirAcesso({
    ligado: process.env.PRE_LANCAMENTO === '1',
    chave,
    caminho: req.nextUrl.pathname,
    acessoNaUrl: req.nextUrl.searchParams.get('acesso'),
    cookie: req.cookies.get(COOKIE_ACESSO)?.value,
  });

  if (decisao === 'liberar') return NextResponse.next();

  if (decisao === 'liberar_e_gravar_cookie') {
    const limpa = req.nextUrl.clone();
    limpa.searchParams.delete('acesso');
    const resposta = NextResponse.redirect(limpa);
    resposta.cookies.set(COOKIE_ACESSO, chave!, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 90 });
    return resposta;
  }

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ erro: 'em breve' }, { status: 503 });
  }
  const resposta = NextResponse.rewrite(new URL(PAGINA_EM_BREVE, req.url));
  resposta.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return resposta;
}

export const config = {
  // Não passa por arquivos estáticos do Next nem pelo ícone.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
