/**
 * Achados da sétima varredura de segurança (14/11/2026), com o banco local/CI e o seed (evento "simulado-10k-dezembro"):
 * - o "criar pedido" dizia se um cupom existe sem o limite de 20 por hora da tela de cupom;
 * - a transferência dizia QUAL CPF já tem inscrição sem o limite de 60 por hora (LGPD).
 * Sem DATABASE_URL, são pulados.
 */
import { randomInt } from 'node:crypto';
import { config } from 'dotenv';
import { afterAll, describe, expect, it, vi } from 'vitest';

config({ path: '.env.local' });
config();

vi.mock('server-only', () => ({}));
vi.mock('@/lib/email/enviar', () => ({ enviarEmail: async () => {} }));

const temBanco = !!process.env.DATABASE_URL;
const sufixo = `${Date.now()}-${process.pid}`;

function cpf(): string {
  const n = Array.from({ length: 9 }, () => randomInt(10));
  const dv = (b: number[], p: number) => ((b.reduce((s, d, i) => s + d * (p - i), 0) * 10) % 11) % 10;
  n.push(dv(n, 10));
  n.push(dv(n, 11));
  return n.join('');
}

describe.skipIf(!temBanco)('sétima varredura: limites do cupom no "criar pedido" e do CPF na transferência', () => {
  const usuariosCriados: string[] = [];

  afterAll(async () => {
    const { db } = await import('@/db');
    const { inscricoes, limitesUso, pedidos, transferencias, usuarios } = await import('@/db/schema');
    const { inArray } = await import('drizzle-orm');
    if (usuariosCriados.length) {
      const ps = await db.select({ id: pedidos.id }).from(pedidos).where(inArray(pedidos.compradorId, usuariosCriados));
      const ids = ps.map((p) => p.id);
      if (ids.length) {
        const ins = await db.select({ id: inscricoes.id }).from(inscricoes).where(inArray(inscricoes.pedidoId, ids));
        if (ins.length) await db.delete(transferencias).where(inArray(transferencias.inscricaoId, ins.map((i) => i.id)));
        await db.delete(inscricoes).where(inArray(inscricoes.pedidoId, ids));
        await db.delete(pedidos).where(inArray(pedidos.id, ids));
      }
      const chaves = usuariosCriados.flatMap((id) => [`cpf:${id}`, `cupom:${id}`]);
      await db.delete(limitesUso).where(inArray(limitesUso.chave, chaves));
      await db.delete(transferencias).where(inArray(transferencias.feitaPor, usuariosCriados));
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

  /** Inscrição confirmada (pedido pago) feita direto no banco. */
  async function inscricaoConfirmada(compradorId: string, doc: string) {
    const { db } = await import('@/db');
    const { inscricoes, pedidos } = await import('@/db/schema');
    const { evento: e, distancia } = await evento();
    const [p] = await db
      .insert(pedidos)
      .values({ eventoId: e.id, compradorId, subtotalCentavos: 5000, totalCentavos: 5000, provedor: 'simulado', status: 'pago', expiraEm: new Date(Date.now() + 30 * 60_000) })
      .returning();
    const [i] = await db
      .insert(inscricoes)
      .values({ pedidoId: p.id, eventoId: e.id, distanciaId: distancia.id, nome: 'Pessoa de Teste', cpf: doc, nascimento: '1990-01-01', precoCentavos: 5000, status: 'confirmada' })
      .returning();
    return i;
  }

  it('"criar pedido": cupom conta no limite de 20 por hora (o mesmo da tela de cupom)', async () => {
    const { criarPedido } = await import('./servico');
    const { cupomDentroDoLimite, MENSAGEM_LIMITE_CUPOM } = await import('@/lib/limites');
    const { evento: e, distancia } = await evento();
    const curioso = await novoUsuario('cupom-curioso');
    const entrada = (cupom: string) => ({
      eventoId: e.id,
      aceite: true,
      cupom,
      participantes: [
        { distanciaId: distancia.id, nome: 'Curioso de Teste', cpf: cpf(), nascimento: '1990-01-01', sexo: 'M', telefone: '(79) 99999-0000', camisa: 'M', contatoEmergencia: 'Mãe 79988887777' },
      ],
    });

    for (let i = 0; i < 20; i++) {
      const r = await criarPedido(curioso, entrada(`INVENTADO${i}`));
      expect(r).toEqual({ ok: false, erros: ['Cupom não encontrado.'] });
    }
    // A 21ª, mesmo com um cupom que existe (AMIGO10 do seed), não revela nada nem cria pedido.
    expect(await criarPedido(curioso, entrada('AMIGO10'))).toEqual({ ok: false, erros: [MENSAGEM_LIMITE_CUPOM] });
    expect(await criarPedido(curioso, entrada('INVENTADO99'))).toEqual({ ok: false, erros: [MENSAGEM_LIMITE_CUPOM] });
    // A tela de cupom (validarCupomAcao) usa a mesma chave: também está bloqueada.
    expect(await cupomDentroDoLimite(curioso.id)).toBe(false);

    // Sem cupom, o pedido continua funcionando.
    const semCupom = { ...entrada(''), cupom: undefined };
    expect((await criarPedido(curioso, semCupom)).ok).toBe(true);
  });

  it('"criar pedido": cada CPF revelado gasta 1 uso do limite de 60 (oitava varredura)', async () => {
    const { criarPedido } = await import('./servico');
    const { MENSAGEM_CPF_JA_INSCRITO_GENERICA } = await import('@/lib/limites');
    const { db } = await import('@/db');
    const { limitesUso } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    const { evento: e, distancia } = await evento();
    const dona = await novoUsuario('dona-de-3-cpfs');
    const inscritos = [cpf(), cpf(), cpf()];
    for (const c of inscritos) await inscricaoConfirmada(dona.id, c);
    const curioso = await novoUsuario('curioso-lote');
    const pessoa = (doc: string) => ({ distanciaId: distancia.id, nome: 'Pessoa de Teste', cpf: doc, email: `p${doc}+${sufixo}@exemplo.invalid`, nascimento: '1990-01-01', sexo: 'M', telefone: '(79) 99999-0000', camisa: 'M', contatoEmergencia: 'Mãe 79988887777' });
    const lote = { eventoId: e.id, aceite: true, participantes: [pessoa(cpf()), ...inscritos.map(pessoa)] };
    const usos = async () => (await db.select().from(limitesUso).where(eq(limitesUso.chave, `cpf:${curioso.id}`))).length;

    const r = await criarPedido(curioso, lote);
    expect(r.ok).toBe(false);
    expect(await usos()).toBe(3); // 3 CPFs revelados = 3 usos

    // Leva a conta a 58 usos: um lote com 3 inscritos não cabe mais, e a resposta é genérica.
    await db.insert(limitesUso).values(Array.from({ length: 55 }, () => ({ chave: `cpf:${curioso.id}` })));
    expect(await usos()).toBe(58);
    const r2 = await criarPedido(curioso, lote);
    expect(r2).toEqual({ ok: false, erros: [MENSAGEM_CPF_JA_INSCRITO_GENERICA] });
    expect(await usos()).toBe(58); // nada gravado quando não cabe
  });

  it('transferência: o CPF já inscrito só aparece dentro do limite de 60 por hora; a 61ª é genérica', async () => {
    const { transferirInscricao } = await import('@/lib/atleta/transferencia');
    const { MENSAGEM_CPF_JA_INSCRITO_GENERICA } = await import('@/lib/limites');
    const { formatarCpf } = await import('@/lib/regras/cpf');

    const dona = await novoUsuario('dona-do-cpf-transf');
    const alvo = cpf();
    await inscricaoConfirmada(dona.id, alvo);

    const curioso = await novoUsuario('curioso-transf');
    const minha = await inscricaoConfirmada(curioso.id, cpf());
    const novo = (doc: string) => ({ nome: 'Carla de Teste', cpf: doc, email: `carla+${sufixo}@exemplo.invalid`, nascimento: '1990-04-04', sexo: 'F', telefone: '(79) 92222-3333', camisa: 'M', contatoEmergencia: 'Filho 79944445555' });

    const respostas: string[] = [];
    for (let i = 0; i < 61; i++) {
      const r = await transferirInscricao(curioso, minha.id, novo(alvo));
      expect(r.ok).toBe(false);
      if (!r.ok) respostas.push(r.erros.join(' '));
    }
    expect(respostas.slice(0, 60).every((m) => m.includes(formatarCpf(alvo)))).toBe(true);
    expect(respostas[60]).toBe(MENSAGEM_CPF_JA_INSCRITO_GENERICA);
    expect(respostas[60]).not.toContain(formatarCpf(alvo));
    expect(respostas[60]).not.toContain(alvo);

    // Com um CPF livre, a transferência acontece normalmente.
    expect(await transferirInscricao(curioso, minha.id, novo(cpf()))).toEqual({ ok: true });
  });
});
