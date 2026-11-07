import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormularioInscricao } from '@/components/FormularioInscricao';
import { LoginCodigo } from '@/components/LoginCodigo';
import { usuarioAtual } from '@/lib/auth/sessao';
import { eventoPorSlug, inscricoesAbertas } from '@/lib/pedidos/consultas';
import { dataLocal } from '@/lib/regras/datas';

export const dynamic = 'force-dynamic';

export default async function Inscricao({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = await eventoPorSlug(slug);
  if (!dados) notFound();
  const { evento, distancias } = dados;
  const voltar = (
    <Link href={`/eventos/${slug}`} className="link text-sm">
      ← {evento.nome}
    </Link>
  );

  if (!inscricoesAbertas(evento)) {
    return (
      <div className="pagina">
        {voltar}
        <div className="cartao"><p>As inscrições deste evento estão encerradas.</p></div>
      </div>
    );
  }

  const usuario = await usuarioAtual();
  if (!usuario) {
    return (
      <div className="pagina">
        {voltar}
        <LoginCodigo destino={`/eventos/${slug}/inscricao`} />
      </div>
    );
  }

  return (
    <FormularioInscricao
      voltar={voltar}
      evento={{
        id: evento.id,
        precoSocioAtivo: evento.precoSocioAtivo,
        pedeCamisa: evento.pedeCamisa,
        usaCategoria: evento.usaCategoria,
        dataEvento: dataLocal(evento.dataHora),
        regulamentoUrl: evento.regulamentoUrl,
      }}
      distancias={distancias.map((d) => ({ id: d.id, nome: d.nome, precoCentavos: d.precoCentavos, precoSocioCentavos: d.precoSocioCentavos }))}
      hoje={dataLocal(new Date())}
      emailConta={usuario.email}
      perfil={{
        nome: usuario.nome ?? '',
        cpf: usuario.cpf ?? '',
        nascimento: usuario.nascimento ?? '',
        sexo: (usuario.sexo as 'F' | 'M' | null) ?? '',
        telefone: usuario.telefone ?? '',
        camisa: usuario.camisa ?? '',
        contatoEmergencia: usuario.contatoEmergencia ?? '',
      }}
    />
  );
}
