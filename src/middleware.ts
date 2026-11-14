import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_ACESSO, PAGINA_EM_BREVE, decidirAcesso } from '@/lib/pre-lancamento';

/** Modo "em breve": veja src/lib/pre-lancamento.ts. */
export function middleware(req: NextRequest) {
  const chave = process.env.CHAVE_PRE_LANCAMENTO;
  const decisao = decidirAcesso({
    ligado: process.env.PRE_LANCAMENTO === '1',
    chave,
    // Caminho BRUTO: o req.nextUrl já vem "limpo" pelo Next (sem .rsc, sem /_next/data/<build>),
    // e isso deixava passar endereços que, no fim, executavam as ações do site.
    caminho: new URL(req.url).pathname,
    metodo: req.method,
    ehAcao: req.headers.has('next-action'),
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

  // API, qualquer envio (POST) e qualquer Server Action param aqui: o rewrite para "em breve" executaria a ação.
  if (new URL(req.url).pathname.startsWith('/api/') || req.headers.has('next-action') || (req.method !== 'GET' && req.method !== 'HEAD')) {
    return NextResponse.json({ erro: 'em breve' }, { status: 503 });
  }
  const resposta = NextResponse.rewrite(new URL(PAGINA_EM_BREVE, req.url));
  resposta.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return resposta;
}

export const config = {
  // Só os arquivos estáticos do Next ficam de fora (com a barra: "/_next/staticX" passa pelo middleware).
  // Ícone e imagens passam por aqui e são liberados só para leitura (quarta varredura, 14/11/2026).
  matcher: ['/((?!_next/static/).*)'],
};
