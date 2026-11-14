import 'server-only';
import { and, asc, count, eq, gt, inArray, lt, max, sql } from 'drizzle-orm';
import { db, type Tx } from '@/db';
import { clubes, cupons, distancias, eventos, inscricoes, pedidos, socios, usuarios } from '@/db/schema';
import type { UsuarioAtual } from '@/lib/auth/sessao';
import { enviarEmail } from '@/lib/email/enviar';
import { emailConfirmacao } from '@/lib/email/modelos';
import { provedorDoClube } from '@/lib/pagamento';
import { formatarCpf, limparCpf, validarCpf } from '@/lib/regras/cpf';
import { dataLocal, formatarDataHora, nascimentoValido } from '@/lib/regras/datas';
import { bloqueioDePedido } from '@/lib/regras/limites-pedido';
import { calcularPedido } from '@/lib/regras/pedido';
import { ErroNegocio } from './erros';
import { pedidoSchema } from './validacao';

/** Tempo que as vagas ficam reservadas esperando o Pix. */
export const MINUTOS_RESERVA = 30;
const ATIVAS = ['pendente', 'confirmada'] as const;

/**
 * Marca como expirados os pedidos pendentes cujo prazo do Pix acabou, liberando as vagas.
 * Roda antes de contar vagas e quando alguém consulta o pedido; não precisa de tarefa agendada.
 */
export async function expirarPendentes(tx: Tx | typeof db, eventoId?: string): Promise<void> {
  const vencidos = await tx
    .update(pedidos)
    .set({ status: 'expirado' })
    .where(and(eq(pedidos.status, 'pendente'), lt(pedidos.expiraEm, new Date()), eventoId ? eq(pedidos.eventoId, eventoId) : undefined))
    .returning({ id: pedidos.id });
  if (vencidos.length) {
    await tx
      .update(inscricoes)
      .set({ status: 'expirada' })
      .where(and(inArray(inscricoes.pedidoId, vencidos.map((v) => v.id)), eq(inscricoes.status, 'pendente')));
  }
}

export type ResultadoCriacao = { ok: true; pedidoId: string } | { ok: false; erros: string[] };

export async function criarPedido(usuario: UsuarioAtual, entradaBruta: unknown): Promise<ResultadoCriacao> {
  // 1. Formato dos dados
  const parse = pedidoSchema.safeParse(entradaBruta);
  if (!parse.success) {
    return { ok: false, erros: [...new Set(parse.error.issues.map((i) => i.message))] };
  }
  const entrada = parse.data;

  // 2. Evento aberto
  const [linha] = await db.select({ evento: eventos, clube: clubes }).from(eventos).innerJoin(clubes, eq(clubes.id, eventos.clubeId)).where(eq(eventos.id, entrada.eventoId));
  if (!linha || linha.evento.status !== 'publicado') return { ok: false, erros: ['Evento não encontrado.'] };
  const { evento, clube } = linha;
  const agora = new Date();
  if (agora > evento.inscricoesAte) return { ok: false, erros: ['As inscrições deste evento estão encerradas.'] };
  const hoje = dataLocal(agora);
  const listaDistancias = await db.select().from(distancias).where(eq(distancias.eventoId, evento.id));

  // 3. Regras por participante
  const erros: string[] = [];
  const participantes = entrada.participantes.map((p) => ({ ...p, sexo: (p.sexo || '') as 'F' | 'M' | '', cpf: limparCpf(p.cpf), email: p.email?.toLowerCase() || null }));
  participantes.forEach((p, i) => {
    const quem = i === 0 ? 'Você' : `Participante ${i + 1}`;
    if (!listaDistancias.some((d) => d.id === p.distanciaId)) erros.push(`${quem}: escolha a distância.`);
    if (!validarCpf(p.cpf)) erros.push(`${quem}: CPF inválido.`);
    if (!nascimentoValido(p.nascimento, hoje)) erros.push(`${quem}: data de nascimento inválida.`);
    if (evento.usaCategoria && !p.sexo) erros.push(`${quem}: informe o sexo (este evento tem categoria).`);
    if (evento.pedeCamisa && !p.camisa) erros.push(`${quem}: escolha o tamanho da camisa.`);
    // Do 2º participante em diante, o e-mail é obrigatório: é por ele que a pessoa vê a própria inscrição
    // (o CPF não dá acesso). Decisão do Allan em 14/11/2026.
    if (i > 0 && !p.email) erros.push(`${quem}: informe o e-mail (a pessoa recebe a confirmação e vê a inscrição com ele).`);
  });
  const cpfs = participantes.map((p) => p.cpf);
  if (new Set(cpfs).size !== cpfs.length) erros.push('Há CPF repetido no pedido.');
  if (erros.length) return { ok: false, erros };

  // 4. Sócios e cupom
  const cpfsSocios = new Set<string>();
  if (evento.precoSocioAtivo) {
    const achados = await db.select({ cpf: socios.cpf }).from(socios).where(and(eq(socios.clubeId, clube.id), inArray(socios.cpf, cpfs)));
    achados.forEach((s) => cpfsSocios.add(s.cpf));
  }
  let cupom: typeof cupons.$inferSelect | null = null;
  const codigoCupom = entrada.cupom?.toUpperCase();
  if (codigoCupom) {
    [cupom] = await db.select().from(cupons).where(and(eq(cupons.eventoId, evento.id), eq(cupons.codigo, codigoCupom), eq(cupons.ativo, true)));
    if (!cupom) return { ok: false, erros: ['Cupom não encontrado.'] };
  }

  // 5. Preço (o servidor sempre recalcula; o valor mostrado na tela não vale)
  const calculo = calcularPedido({
    participantes,
    distancias: listaDistancias,
    precoSocioAtivo: evento.precoSocioAtivo,
    usaCategoria: evento.usaCategoria,
    cpfsSocios,
    cupom: cupom ? { tipo: cupom.tipo as 'percentual' | 'valor', valor: cupom.valor } : null,
    dataInscricao: hoje,
    dataEvento: dataLocal(evento.dataHora),
  });

  // 6. Reserva das vagas e gravação, numa transação
  let pedidoId: string;
  try {
    pedidoId = await db.transaction(async (tx) => {
      await expirarPendentes(tx, evento.id);

      // Limite de pedidos aguardando Pix (dentro da transação, para pedidos simultâneos não escaparem).
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'pedidos-conta:' + usuario.id}))`);
      const pendentes = await tx
        .select({ id: pedidos.id, eventoId: pedidos.eventoId })
        .from(pedidos)
        .where(and(eq(pedidos.compradorId, usuario.id), eq(pedidos.status, 'pendente'), gt(pedidos.expiraEm, new Date())));
      const pendentesNoEvento = pendentes.filter((p) => p.eventoId === evento.id);
      const [{ pessoas }] = pendentesNoEvento.length
        ? await tx.select({ pessoas: count() }).from(inscricoes).where(inArray(inscricoes.pedidoId, pendentesNoEvento.map((p) => p.id)))
        : [{ pessoas: 0 }];
      const bloqueio = bloqueioDePedido(pendentesNoEvento.length, pendentes.length, pessoas + participantes.length);
      if (bloqueio) throw new ErroNegocio(bloqueio);

      // Trava as distâncias do evento: duas pessoas não pegam a última vaga ao mesmo tempo.
      const travadas = await tx.select().from(distancias).where(eq(distancias.eventoId, evento.id)).for('update');
      for (const d of travadas) {
        const pedindo = participantes.filter((p) => p.distanciaId === d.id).length;
        if (!pedindo || d.vagas == null) continue;
        const [{ ocupadas }] = await tx
          .select({ ocupadas: count() })
          .from(inscricoes)
          .where(and(eq(inscricoes.distanciaId, d.id), inArray(inscricoes.status, [...ATIVAS])));
        if (ocupadas + pedindo > d.vagas) {
          throw new ErroNegocio(d.vagas - ocupadas > 0 ? `${d.nome}: restam só ${d.vagas - ocupadas} vaga(s).` : `${d.nome}: inscrições esgotadas.`);
        }
      }

      if (cupom?.limite != null) {
        await tx.select({ id: cupons.id }).from(cupons).where(eq(cupons.id, cupom.id)).for('update');
        const [{ usados }] = await tx
          .select({ usados: count() })
          .from(pedidos)
          .where(and(eq(pedidos.cupomId, cupom.id), inArray(pedidos.status, ['pendente', 'pago'])));
        if (usados >= cupom.limite) throw new ErroNegocio('Este cupom esgotou.');
      }

      const jaInscritos = await tx
        .select({ cpf: inscricoes.cpf })
        .from(inscricoes)
        .where(and(eq(inscricoes.eventoId, evento.id), inArray(inscricoes.cpf, cpfs), inArray(inscricoes.status, [...ATIVAS])));
      if (jaInscritos.length) {
        throw new ErroNegocio(`Já existe inscrição neste evento para o CPF ${jaInscritos.map((j) => formatarCpf(j.cpf)).join(', ')}.`);
      }

      const [novo] = await tx
        .insert(pedidos)
        .values({
          eventoId: evento.id,
          compradorId: usuario.id,
          subtotalCentavos: calculo.subtotal,
          descontoCentavos: calculo.desconto,
          totalCentavos: calculo.total,
          cupomId: calculo.desconto > 0 && cupom ? cupom.id : null,
          provedor: 'simulado', // atualizado abaixo, quando o Pix for criado
          expiraEm: new Date(Date.now() + MINUTOS_RESERVA * 60 * 1000),
        })
        .returning({ id: pedidos.id });

      await tx.insert(inscricoes).values(
        participantes.map((p, i) => ({
          pedidoId: novo.id,
          eventoId: evento.id,
          distanciaId: p.distanciaId,
          nome: p.nome,
          cpf: p.cpf,
          email: i === 0 ? usuario.email : p.email,
          nascimento: p.nascimento,
          sexo: p.sexo || null,
          telefone: p.telefone,
          camisa: evento.pedeCamisa ? (p.camisa ?? null) : null,
          contatoEmergencia: p.contatoEmergencia,
          categoria: calculo.itens[i].categoria,
          precoCentavos: calculo.itens[i].valor,
          motivoDesconto: calculo.itens[i].motivo,
        })),
      );
      return novo.id;
    });
  } catch (e) {
    if (e instanceof ErroNegocio) return { ok: false, erros: [e.message] };
    if (typeof e === 'object' && e && 'code' in e && e.code === '23505') return { ok: false, erros: ['Um dos CPFs já tem inscrição neste evento.'] };
    throw e;
  }

  // 7. Guarda os dados do participante 1 ("Você") na conta, para a próxima inscrição vir preenchida.
  //    Se a conta já tem outro CPF (a pessoa está inscrevendo outra pessoa), não sobrescreve.
  const eu = participantes[0];
  if (!usuario.cpf || usuario.cpf === eu.cpf) {
    await db
      .update(usuarios)
      .set({
        nome: eu.nome,
        cpf: eu.cpf,
        nascimento: eu.nascimento,
        // Evento sem categoria ou sem camisa não pergunta: mantém o que já estava no cadastro.
        sexo: eu.sexo || usuario.sexo,
        telefone: eu.telefone,
        camisa: eu.camisa || usuario.camisa,
        contatoEmergencia: eu.contatoEmergencia,
      })
      .where(eq(usuarios.id, usuario.id));
  }

  // 8. Pedido gratuito (ex.: cupom de 100%) confirma na hora.
  if (calculo.total === 0) {
    await db.update(pedidos).set({ provedor: 'gratuito' }).where(eq(pedidos.id, pedidoId));
    await confirmarPagamento(pedidoId, null);
    return { ok: true, pedidoId };
  }

  // 9. Cria o Pix. Se o Mercado Pago falhar, libera as vagas.
  try {
    const provedor = await provedorDoClube(clube);
    const [pedido] = await db.select().from(pedidos).where(eq(pedidos.id, pedidoId));
    const pix = await provedor.criarPix({
      pedidoId,
      totalCentavos: calculo.total,
      descricao: `Inscrição ${evento.nome}`,
      expiraEm: pedido.expiraEm,
      comprador: { email: usuario.email, nome: eu.nome, cpf: eu.cpf },
    });
    await db
      .update(pedidos)
      .set({ provedor: provedor.nome, pagamentoId: pix.pagamentoId, pixCopiaECola: pix.copiaECola, pixQrBase64: pix.qrBase64 })
      .where(eq(pedidos.id, pedidoId));
  } catch (e) {
    console.error('Falha ao criar Pix', e);
    await cancelarPedido(pedidoId);
    return { ok: false, erros: [e instanceof Error ? e.message : 'Não foi possível gerar o Pix. Tente de novo.'] };
  }
  return { ok: true, pedidoId };
}

async function cancelarPedido(pedidoId: string) {
  await db.transaction(async (tx) => {
    await tx.update(pedidos).set({ status: 'cancelado' }).where(eq(pedidos.id, pedidoId));
    await tx.update(inscricoes).set({ status: 'cancelada' }).where(eq(inscricoes.pedidoId, pedidoId));
  });
}

/**
 * Confirma o pagamento: inscrições viram "confirmada" e recebem número.
 * Pode ser chamada mais de uma vez (webhook repetido, consulta da tela): só confirma uma vez.
 * Se o Pix cair depois que o pedido expirou e alguém já tiver pego a vaga do mesmo CPF,
 * o pedido fica como "pago_conflito" para a organização resolver.
 */
export async function confirmarPagamento(pedidoId: string, taxaGatewayCentavos: number | null): Promise<boolean> {
  const confirmado = await db.transaction(async (tx) => {
    const [p] = await tx.select().from(pedidos).where(eq(pedidos.id, pedidoId)).for('update');
    if (!p || !['pendente', 'expirado', 'cancelado'].includes(p.status)) return false;

    // Trava o evento para numerar as inscrições em sequência.
    await tx.select({ id: eventos.id }).from(eventos).where(eq(eventos.id, p.eventoId)).for('update');
    const lista = await tx.select().from(inscricoes).where(eq(inscricoes.pedidoId, p.id)).orderBy(asc(inscricoes.criadoEm), asc(inscricoes.id));

    if (p.status !== 'pendente') {
      const conflitos = await tx
        .select({ id: inscricoes.id })
        .from(inscricoes)
        .where(
          and(
            eq(inscricoes.eventoId, p.eventoId),
            inArray(inscricoes.cpf, lista.map((i) => i.cpf)),
            inArray(inscricoes.status, [...ATIVAS]),
            sql`${inscricoes.pedidoId} <> ${p.id}`,
          ),
        );
      if (conflitos.length) {
        await tx.update(pedidos).set({ status: 'pago_conflito', pagoEm: new Date(), taxaGatewayCentavos }).where(eq(pedidos.id, p.id));
        return false;
      }
    }

    const [{ maior }] = await tx.select({ maior: max(inscricoes.numero) }).from(inscricoes).where(eq(inscricoes.eventoId, p.eventoId));
    let numero = maior ?? 0;
    for (const i of lista) {
      numero += 1;
      await tx.update(inscricoes).set({ status: 'confirmada', numero }).where(eq(inscricoes.id, i.id));
    }
    await tx.update(pedidos).set({ status: 'pago', pagoEm: new Date(), taxaGatewayCentavos }).where(eq(pedidos.id, p.id));
    return true;
  });

  if (confirmado) {
    await enviarConfirmacao(pedidoId).catch((e) => console.error('Falha ao enviar confirmação', e));
  }
  return confirmado;
}

async function enviarConfirmacao(pedidoId: string) {
  const [linha] = await db
    .select({ pedido: pedidos, evento: eventos, comprador: usuarios })
    .from(pedidos)
    .innerJoin(eventos, eq(eventos.id, pedidos.eventoId))
    .innerJoin(usuarios, eq(usuarios.id, pedidos.compradorId))
    .where(eq(pedidos.id, pedidoId));
  if (!linha) return;
  const lista = await db
    .select({ nome: inscricoes.nome, email: inscricoes.email, numero: inscricoes.numero, distancia: distancias.nome })
    .from(inscricoes)
    .innerJoin(distancias, eq(distancias.id, inscricoes.distanciaId))
    .where(eq(inscricoes.pedidoId, pedidoId))
    .orderBy(asc(inscricoes.numero));
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const base = { evento: linha.evento.nome, data: formatarDataHora(linha.evento.dataHora), total: linha.pedido.totalCentavos };

  await enviarEmail({ para: linha.comprador.email, ...emailConfirmacao({ ...base, participantes: lista, link: `${appUrl}/pedidos/${pedidoId}` }) });
  // Cada participante com e-mail diferente do comprador recebe só a própria inscrição.
  for (const p of lista) {
    if (p.email && p.email !== linha.comprador.email) {
      await enviarEmail({ para: p.email, ...emailConfirmacao({ ...base, total: 0, participantes: [p], link: `${appUrl}/minhas-inscricoes` }) });
    }
  }
}

/** Confere no provedor se um pedido pendente já foi pago (usado pela tela do Pix e pelo webhook). */
export async function sincronizarPagamento(pedidoId: string): Promise<void> {
  const [linha] = await db
    .select({ pedido: pedidos, clube: clubes })
    .from(pedidos)
    .innerJoin(eventos, eq(eventos.id, pedidos.eventoId))
    .innerJoin(clubes, eq(clubes.id, eventos.clubeId))
    .where(eq(pedidos.id, pedidoId));
  if (!linha || !linha.pedido.pagamentoId || linha.pedido.provedor !== 'mercadopago') return;
  if (!['pendente', 'expirado'].includes(linha.pedido.status)) return;
  const consulta = await (await provedorDoClube(linha.clube)).consultar(linha.pedido.pagamentoId);
  // A order no Mercado Pago precisa apontar para ESTE pedido (external_reference); vazio também não vale.
  if (consulta.pedidoId !== pedidoId) return;
  if (consulta.status === 'aprovado' && consulta.valorCentavos >= linha.pedido.totalCentavos) {
    await confirmarPagamento(pedidoId, consulta.taxaCentavos);
  }
}
