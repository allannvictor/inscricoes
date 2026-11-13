import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FormularioMeusDados } from '@/components/FormularioMeusDados';
import { usuarioAtual } from '@/lib/auth/sessao';
import { dataLocal } from '@/lib/regras/datas';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meus dados', robots: { index: false } };

export default async function MinhaConta() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect('/entrar?voltar=/minha-conta');
  return (
    <div className="pagina">
      <Link href="/minhas-inscricoes" className="link text-sm">← Minhas inscrições</Link>
      <div>
        <h1 className="titulo-2">Meus dados</h1>
        <p className="text-sm text-suave">Conta: {usuario.email}</p>
      </div>
      <FormularioMeusDados
        hoje={dataLocal(new Date())}
        inicial={{
          nome: usuario.nome ?? '',
          cpf: usuario.cpf ?? '',
          nascimento: usuario.nascimento ?? '',
          sexo: (usuario.sexo as 'F' | 'M' | null) ?? '',
          telefone: usuario.telefone ?? '',
          camisa: usuario.camisa ?? '',
          contatoEmergencia: usuario.contatoEmergencia ?? '',
        }}
      />
    </div>
  );
}
