import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormularioInscricao } from '@/components/FormularioInscricao';
import { LoginCodigo } from '@/components/LoginCodigo';
import { usuarioAtual } from '@/lib/auth/sessao';
import { eventoPorSlug, inscricoesAbertas } from '@/lib/pedidos/consultas';
import { dataLocal } from '@/lib/regras/datas';
import { db } from '@/db';
import { inscricoes, pedidos } from '@/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

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

  // O dono da conta já tem inscrição ativa neste evento?
  const [minha] = usuario.cpf
    ? await db
        .select({ numero: inscricoes.numero, status: inscricoes.status, pedidoId: pedidos.id, compradorId: pedidos.compradorId })
        .from(inscricoes)
        .innerJoin(pedidos, eq(pedidos.id, inscricoes.pedidoId))
        .where(and(eq(inscricoes.eventoId, evento.id), eq(inscricoes.cpf, usuario.cpf), inArray(inscricoes.status, ['pendente', 'confirmada'])))
        .orderBy(desc(inscricoes.criadoEm))
        .limit(1)
    : [];

  return (
    <FormularioInscricao
      jaInscrito={
        minha
          ? { numero: minha.numero, pago: minha.status === 'confirmada', pedidoId: minha.compradorId === usuario.id ? minha.pedidoId : null }
          : null
      }
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
