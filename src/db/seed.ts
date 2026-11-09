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

// Modelo real: o último simulado da CF (originalmente em 11/10/2026), com data futura para testar.
// "Alunos CF" = preço de sócio (pela lista de CPFs); visitantes pagam o preço normal.
const slugCf = 'simuladao-run-da-cf-maratona-de-aracaju';
const [jaExisteCf] = await db.select({ id: eventos.id }).from(eventos).where(eq(eventos.slug, slugCf));
if (!jaExisteCf) {
  const [cf] = await db
    .insert(eventos)
    .values({
      clubeId: clube.id,
      slug: slugCf,
      nome: 'Simuladão Run da CF – Para a Maratona de Aracaju',
      dataHora: new Date('2027-10-10T04:00:00-03:00'),
      local: 'Pulse Centro de Treinamento – Aracaju/SE',
      descricao: [
        'Está se preparando para a Maratona de Aracaju? O Simuladão Run da CF é a oportunidade de colocar o treinamento à prova: percurso, ritmo e gel da prova.',
        '',
        'Escolha 5 km, 10 km, 18 km ou 30 km e teste sua estratégia, ritmo, resistência e alimentação durante o percurso.',
        '',
        'Concentração às 4h no Pulse Centro de Treinamento.',
        'Alunos da CF: R$ 30 (preço aplicado automaticamente pelo CPF). Atletas externos: R$ 50.',
        '',
        'Termo de responsabilidade: ao se inscrever, o participante declara que leu e concorda com o regulamento, participa por vontade própria, está ciente de que é um esporte de risco, está em condições de saúde segundo avaliação médica e devidamente treinado, e assume os riscos de participar do evento.',
      ].join('\n'),
      inscricoesAte: new Date('2027-10-07T23:59:59-03:00'),
      transferenciaAte: new Date('2027-10-04T23:59:59-03:00'),
      status: 'publicado',
      precoSocioAtivo: true,
      pedeCamisa: false,
      usaCategoria: true,
    })
    .returning();
  await db.insert(distancias).values(
    ['5 km', '10 km', '18 km', '30 km'].map((nome, i) => ({ eventoId: cf.id, nome, precoCentavos: 5000, precoSocioCentavos: 3000, ordem: i + 1 })),
  );
}

// CPFs fictícios válidos, usados como sócios de exemplo.
await db
  .insert(socios)
  .values([
    { clubeId: clube.id, cpf: '52998224725', nome: 'Marina Costa (exemplo)' },
    { clubeId: clube.id, cpf: '11144477735', nome: 'Rafael Lima (exemplo)' },
  ])
  .onConflictDoNothing();

console.log(`Pronto. Eventos: /eventos/${slug} e /eventos/${slugCf} · organizador: ${emailOrg}`);
process.exit(0);
