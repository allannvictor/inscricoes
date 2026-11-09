import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { organizadores, usuarios } from '@/db/schema';
import { enviarFotoClubeAcao } from '@/app/painel/acoes';
import { EnvioArquivo } from '@/components/painel/EnvioArquivo';
import { FormularioPerfil, Organizadores } from '@/components/painel/PerfilClube';
import { exigirClube } from '@/lib/painel/acesso';

export const metadata = { title: 'Perfil do clube', robots: { index: false } };

export default async function Perfil({ params }: { params: Promise<{ clube: string }> }) {
  const { usuario, clube } = await exigirClube((await params).clube);
  const lista = await db
    .select({ id: usuarios.id, email: usuarios.email, nome: usuarios.nome })
    .from(organizadores)
    .innerJoin(usuarios, eq(usuarios.id, organizadores.usuarioId))
    .where(eq(organizadores.clubeId, clube.id))
    .orderBy(asc(usuarios.email));
  const whats = clube.whatsapp?.replace(/^55/, '') ?? '';
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <section className="cartao">
        <h3 className="titulo-3">Perfil do clube</h3>
        <EnvioArquivo
          id="foto-clube"
          rotulo="Foto ou logo"
          tipo="imagem"
          previa="redonda"
          atual={clube.fotoUrl}
          dica="Quadrada, por exemplo 400 × 400. Aparece na página de todos os eventos do clube."
          enviar={enviarFotoClubeAcao.bind(null, clube.id)}
        />
        <FormularioPerfil clubeId={clube.id} inicial={{ nome: clube.nome, whatsapp: whats, instagram: clube.instagram ?? '', email: clube.email ?? '' }} />
      </section>
      <section className="cartao">
        <h3 className="titulo-3">Organizadores</h3>
        <Organizadores clubeId={clube.id} lista={lista} euId={usuario.id} />
      </section>
    </div>
  );
}
