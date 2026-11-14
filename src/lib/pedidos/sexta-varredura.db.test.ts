/**
 * Achados da sexta varredura de segurança (14/11/2026), com o banco local/CI e o seed (evento "simulado-10k-dezembro"):
 * - "criar pedido" dizia QUAL CPF já tinha inscrição sem passar pelo limite de 60 consultas por hora (LGPD);
 * - "Simular Pix" confirmava pedido expirado, pedido ainda sem Pix ("criando") e pedido de clube com conta real.
 * Sem DATABASE_URL, são pulados.
 */
import { randomInt } from 'node:crypto';
import { config } from 'dotenv';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

config({ path: '.env.local' });
config();

const espiao = vi.hoisted(() => ({ usuario: null as unknown }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/email/enviar', () => ({ enviarEmail: async () => {} }));
vi.mock('@/lib/auth/sessao', () => ({ usuarioAtual: async () => espiao.usuario }));

const temBanco = !!process.env.DATABASE_URL;
const sufixo = `${Date.now()}-${process.pid}`;

function cpf(): string {
  const n = Array.from({ length: 9 }, () => randomInt(10));
  const dv = (b: number[], p: number) => ((b.reduce((s, d, i) => s + d * (p - i), 0) * 10) % 11) % 10;
  n.push(dv(n, 10));
  n.push(dv(n, 11));
  return n.join('');
}

describe.skipIf(!temBanco)('sexta varredura: CPF no "criar pedido" e "Simular Pix"', () => {
  const pedidosCriados: string[] = [];
  const usuariosCriados: string[] = [];

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    const { db } = await import('@/db');
    const { inscricoes, limitesUso, pedidos, usuarios } = await import('@/db/schema');
    const { inArray } = await import('drizzle-orm');
    const doTeste = usuariosCriados.length ? await db.select({ id: pedidos.id }).from(pedidos).where(inArray(pedidos.compradorId, usuariosCriados)) : [];
    const ids = [...new Set([...pedidosCriados, ...doTeste.map((p) => p.id)])];
    if (ids.length) {
      await db.delete(inscricoes).where(inArray(inscricoes.pedidoId, ids));
      await db.delete(pedidos).where(inArray(pedidos.id, ids));
    }
    if (usuariosCriados.length) {
      await db.delete(limitesUso).where(inArray(limitesUso.chave, usuariosCriados.map((id) => `cpf:${id}`)));
      await db.delete(usuarios).where(inArray(usuarios.id, usuariosCriados));
    }
    await (db.$client as unknown as { end: () => Promise<void> }).end();
  });

  async function evento() {
    const { db } = await import('@/db');
    const { distancias, eventos } = await import('@/db/schema');
    const { asc, eq } = await import('drizzle-orm');
    const [e] = await db.select().from(eventos).where(eq(eventos.slug, 'simulado-10k-dezembro'));
    const [d] = await db.select().from(distancias).where(eq(distancias.eventoId, e.id)).orderBy(asc(distancias.ordem));
    return { evento: e, distancia: d };
  }

  async function novoUsuario(nome: string) {
    const { db } = await import('@/db');
    const { usuarios } = await import('@/db/schema');
    const [u] = await db.insert(usuarios).values({ email: `${nome}+${sufixo}@exemplo.invalid` }).returning();
    usuariosCriados.push(u.id);
    return { ...u, clubesOrganizados: [] as string[], admin: false };
  }

  /** Pedido feito direto no banco, com uma inscrição. */
  async function pedidoNoBanco(compradorId: string, extra: { status: string; provedor: string; cpf?: string; statusInscricao?: string }) {
    const { db } = await import('@/db');
    const { inscricoes, pedidos } = await import('@/db/schema');
    const { evento: e, distancia } = await evento();
    const [p] = await db
      .insert(pedidos)
      .values({ eventoId: e.id, compradorId, subtotalCentavos: 5000, totalCentavos: 5000, provedor: extra.provedor, status: extra.status, expiraEm: new Date(Date.now() + 30 * 60_000) })
      .returning();
    pedidosCriados.push(p.id);
    await db.insert(inscricoes).values({
      pedidoId: p.id,
      eventoId: e.id,
      distanciaId: distancia.id,
      nome: 'Pessoa de Teste',
      cpf: extra.cpf ?? cpf(),
      nascimento: '1990-01-01',
      precoCentavos: 5000,
      status: extra.statusInscricao ?? 'pendente',
    });
    return p;
  }

  it('"criar pedido": o CPF já inscrito só aparece dentro do limite de 60 por hora; a 61ª tentativa é genérica', async () => {
    const { criarPedido, MENSAGEM_CPF_JA_INSCRITO_GENERICA } = await import('./servico');
    const { formatarCpf } = await import('@/lib/regras/cpf');
    const { evento: e, distancia } = await evento();

    // Outra pessoa já está inscrita com este CPF.
    const dona = await novoUsuario('dona-do-cpf');
    const alvo = cpf();
    await pedidoNoBanco(dona.id, { status: 'pago', provedor: 'simulado', cpf: alvo, statusInscricao: 'confirmada' });

    const curioso = await novoUsuario('curioso');
    const entrada = (doc: string) => ({
      eventoId: e.id,
      aceite: true,
      participantes: [
        {
          distanciaId: distancia.id,
          nome: 'Curioso de Teste',
          cpf: doc,
          nascimento: '1990-01-01',
          sexo: 'M',
          telefone: '(79) 99999-0000',
          camisa: 'M',
          contatoEmergencia: 'Mãe 79988887777',
        },
      ],
    });

    const respostas: string[] = [];
    for (let i = 0; i < 61; i++) {
      const r = await criarPedido(curioso, entrada(alvo));
      expect(r.ok).toBe(false);
      if (!r.ok) respostas.push(r.erros.join(' '));
    }
    // As 60 primeiras dizem o CPF (é o próprio formulário avisando); a 61ª não.
    expect(respostas.slice(0, 60).every((m) => m.includes(formatarCpf(alvo)))).toBe(true);
    expect(respostas[60]).toBe(MENSAGEM_CPF_JA_INSCRITO_GENERICA);
    expect(respostas[60]).not.toContain(formatarCpf(alvo));
    expect(respostas[60]).not.toContain(alvo);

    // A consulta do formulário (verificarCpfAcao) usa o mesmo limite: também está bloqueada para esta conta.
    const { dentroDoLimite } = await import('@/lib/limites');
    expect(await dentroDoLimite(`cpf:${curioso.id}`, 60, 60 * 60 * 1000)).toBe(false);

    // Um pedido normal continua funcionando, e o provedor provisório "criando" é trocado pelo de verdade.
    const r = await criarPedido(curioso, entrada(cpf()));
    expect(r.ok).toBe(true);
    if (r.ok) {
      pedidosCriados.push(r.pedidoId);
      const { db } = await import('@/db');
      const { pedidos } = await import('@/db/schema');
      const { eq } = await import('drizzle-orm');
      const [p] = await db.select().from(pedidos).where(eq(pedidos.id, r.pedidoId));
      expect(p.provedor).toBe('simulado'); // clube de teste sem conta, fora da produção
      expect(p.status).toBe('pendente');
    }
  });

  async function simular(pedidoId: string) {
    const { POST } = await import('@/app/api/pedidos/[id]/simular/route');
    return POST(new Request(`http://localhost/api/pedidos/${pedidoId}/simular`, { method: 'POST' }), { params: Promise.resolve({ id: pedidoId }) });
  }

  async function statusDoPedido(id: string) {
    const { db } = await import('@/db');
    const { pedidos } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    return (await db.select({ status: pedidos.status }).from(pedidos).where(eq(pedidos.id, id)))[0].status;
  }

  it('"Simular Pix": recusa pedido expirado, cancelado, "criando", de outra pessoa e de clube com conta real', async () => {
    vi.stubEnv('MP_ACCESS_TOKEN', '');
    const comprador = await novoUsuario('comprador-simular');
    const outro = await novoUsuario('outro-simular');
    espiao.usuario = comprador;

    for (const status of ['expirado', 'cancelado']) {
      const p = await pedidoNoBanco(comprador.id, { status, provedor: 'simulado' });
      expect((await simular(p.id)).status).toBe(404);
      expect(await statusDoPedido(p.id)).toBe(status);
    }

    const criando = await pedidoNoBanco(comprador.id, { status: 'pendente', provedor: 'criando' });
    expect((await simular(criando.id)).status).toBe(404);
    expect(await statusDoPedido(criando.id)).toBe('pendente');

    const pendente = await pedidoNoBanco(comprador.id, { status: 'pendente', provedor: 'simulado' });
    espiao.usuario = outro;
    expect((await simular(pendente.id)).status).toBe(404);
    espiao.usuario = comprador;

    // O clube (CF) passa a receber por uma conta real (token do site): o pedido simulado antigo não vale mais.
    vi.stubEnv('MP_ACCESS_TOKEN', 'APP_USR-de-teste');
    expect((await simular(pendente.id)).status).toBe(404);
    expect(await statusDoPedido(pendente.id)).toBe('pendente');

    // Id que não é UUID de verdade: 404 limpo, sem erro 500.
    expect((await simular('-'.repeat(36))).status).toBe(404);

    // Clube no modo simulado, pedido pendente do próprio comprador: confirma.
    vi.stubEnv('MP_ACCESS_TOKEN', '');
    expect((await simular(pendente.id)).status).toBe(200);
    expect(await statusDoPedido(pendente.id)).toBe('pago');
  });
});
