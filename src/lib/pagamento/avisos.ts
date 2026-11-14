import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { organizadores, usuarios } from '@/db/schema';
import { enviarEmail } from '@/lib/email/enviar';
import { emailAvisoSeguranca } from '@/lib/email/modelos';

/**
 * A conta que recebe o dinheiro de um clube mudou: avisa TODOS os organizadores do clube e os masters.
 * Assim, uma troca feita sem combinar (por exemplo, por um organizador de má-fé) não passa despercebida.
 */
export async function avisarMudancaContaMp(args: {
  clube: { id: string; nome: string; slug: string };
  acao: 'conectada' | 'trocada' | 'desconectada';
  porEmail: string;
  contaId?: string | null;
}): Promise<void> {
  const lista = await db
    .select({ email: usuarios.email })
    .from(organizadores)
    .innerJoin(usuarios, eq(usuarios.id, organizadores.usuarioId))
    .where(eq(organizadores.clubeId, args.clube.id));
  const masters = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const destinos = [...new Set([...lista.map((l) => l.email), ...masters])];

  const linhas = [
    args.acao === 'desconectada'
      ? `A conta Mercado Pago do ${args.clube.nome} foi desconectada por ${args.porEmail}. Os eventos publicados não recebem Pix até uma conta ser conectada de novo.`
      : `A conta Mercado Pago que recebe os Pix do ${args.clube.nome} foi ${args.acao} por ${args.porEmail}${args.contaId ? ` (conta nº ${args.contaId})` : ''}.`,
    `Confira em: ${process.env.APP_URL ?? ''}/painel/c/${args.clube.slug}/pagamento`,
  ];
  const msg = emailAvisoSeguranca({
    assunto: `Conta Mercado Pago do ${args.clube.nome} ${args.acao}`,
    titulo: `Conta de recebimento ${args.acao}`,
    linhas,
    seNaoFoiVoce: 'Se essa mudança não foi combinada, entre no painel, conecte a conta certa e remova o organizador que fez a troca. Depois, fale com a plataforma.',
  });
  await Promise.all(destinos.map((para) => enviarEmail({ para, ...msg }).catch((e) => console.error('Aviso de conta Mercado Pago não enviado', e))));
}
