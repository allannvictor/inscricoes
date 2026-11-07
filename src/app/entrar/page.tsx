import { redirect } from 'next/navigation';
import { LoginCodigo } from '@/components/LoginCodigo';
import { usuarioAtual } from '@/lib/auth/sessao';

export const metadata = { title: 'Entrar' };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ voltar?: string }> }) {
  const { voltar } = await searchParams;
  const destino = voltar?.startsWith('/') && !voltar.startsWith('//') ? voltar : '/';
  if (await usuarioAtual()) redirect(destino);
  return (
    <div className="pagina">
      <LoginCodigo destino={destino} />
    </div>
  );
}
