/**
 * Dados de exemplo: clube CF, um Simulado 10K publicado, sócios e cupons.
 * `npm run db:seed` (pode rodar mais de uma vez).
 * Organizador: SEED_ORGANIZADOR_EMAIL (padrão organizador@exemplo.com).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

// Na Vercel o seed só roda se a variável RODAR_SEED=1 estiver configurada.
if (process.argv.includes('--so-se-RODAR_SEED') && process.env.RODAR_SEED !== '1') {
  console.log('Seed pulado (RODAR_SEED diferente de 1).');
  process.exit(0);
}

const { db } = await import('./index');
const { clubes, cupons, distancias, eventos, organizadores, socios, usuarios } = await import('./schema');
const { eq } = await import('drizzle-orm');

const [clube] = await db
  .insert(clubes)
  .values({ nome: 'CF Assessoria Esportiva', slug: 'cf-assessoria', instagram: '@cfassessoriaesportiva', whatsapp: '5500999990000' })
  .onConflictDoUpdate({ target: clubes.slug, set: { nome: 'CF Assessoria Esportiva' } })
  .returning();

const emailOrg = (process.env.SEED_ORGANIZADOR_EMAIL ?? 'organizador@exemplo.com').toLowerCase();
const [org] = await db.insert(usuarios).values({ email: emailOrg }).onConflictDoUpdate({ target: usuarios.email, set: { email: emailOrg } }).returning();
await db.insert(organizadores).values({ clubeId: clube.id, usuarioId: org.id }).onConflictDoNothing();

const slug = 'simulado-10k-dezembro';
let [evento] = await db.select().from(eventos).where(eq(eventos.slug, slug));
if (!evento) {
  [evento] = await db
    .insert(eventos)
    .values({
      clubeId: clube.id,
      slug,
      nome: 'Simulado 10K',
      dataHora: new Date('2026-12-13T05:30:00-03:00'),
      local: 'Parque da Cidade (exemplo)',
      descricao: 'Kit: camisa, medalha, água e fruta na chegada.',
      inscricoesAte: new Date('2026-12-10T23:59:59-03:00'),
      transferenciaAte: new Date('2026-12-06T23:59:59-03:00'),
      status: 'publicado',
      precoSocioAtivo: true,
    })
    .returning();
  await db.insert(distancias).values([
    { eventoId: evento.id, nome: '5 km', precoCentavos: 5000, precoSocioCentavos: 4000, vagas: 80, ordem: 1 },
    { eventoId: evento.id, nome: '10 km', precoCentavos: 6000, precoSocioCentavos: 4500, vagas: 100, ordem: 2 },
    { eventoId: evento.id, nome: '21 km', precoCentavos: 8000, precoSocioCentavos: 6500, vagas: 40, ordem: 3 },
  ]);
  await db.insert(cupons).values([
    { eventoId: evento.id, codigo: 'AMIGO10', tipo: 'percentual', valor: 10, limite: 20 },
    { eventoId: evento.id, codigo: 'PARCEIRO', tipo: 'valor', valor: 1000, limite: 10 },
  ]);
}

// CPFs fictícios válidos, usados como sócios de exemplo.
await db
  .insert(socios)
  .values([
    { clubeId: clube.id, cpf: '52998224725', nome: 'Marina Costa (exemplo)' },
    { clubeId: clube.id, cpf: '11144477735', nome: 'Rafael Lima (exemplo)' },
  ])
  .onConflictDoNothing();

console.log(`Pronto. Evento: /eventos/${slug} · organizador: ${emailOrg}`);
process.exit(0);
