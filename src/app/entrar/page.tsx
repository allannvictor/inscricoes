import { redirect } from 'next/navigation';
import { LoginCodigo } from '@/components/LoginCodigo';
import { codigoTesteAtivo } from '@/lib/ambiente';
import { googleAtivo } from '@/lib/auth/google';
import { usuarioAtual } from '@/lib/auth/sessao';
import { destinoInterno } from '@/lib/regras/redirecionamento';
import { mensagemDoMapa, textoDoParametro } from '@/lib/regras/parametros';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Entrar' };

const ERROS: Record<string, string> = {
  google: 'Não foi possível entrar com o Google. Tente de novo ou use o código por e-mail.',
  'google-email': 'O e-mail desta conta Google não está verificado. Entre com o código por e-mail.',
};

export default async function Entrar({ searchParams }: { searchParams: Promise<{ voltar?: string | string[]; erro?: string | string[] }> }) {
  const { voltar, erro } = await searchParams;
  const destino = destinoInterno(textoDoParametro(voltar));
  if (await usuarioAtual()) redirect(destino);
  return (
    <div className="pagina">
      <LoginCodigo destino={destino} modoTeste={!!codigoTesteAtivo()} google={googleAtivo()} erroInicial={mensagemDoMapa(ERROS, erro) ?? null} />
    </div>
  );
}
