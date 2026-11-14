import 'server-only';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { db } from '@/db';
import { eventos, inscricoes, transferencias } from '@/db/schema';
import { podeTransferirInscricao } from '@/lib/auth/permissoes';
import { paraPermissao, type UsuarioAtual } from '@/lib/auth/sessao';
import { enviarEmail } from '@/lib/email/enviar';
import { emailTransferenciaEnviada, emailTransferenciaRecebida } from '@/lib/email/modelos';
import { categoria } from '@/lib/regras/categoria';
import { formatarCpf, limparCpf, validarCpf } from '@/lib/regras/cpf';
import { dataLocal, formatarDataHora, nascimentoValido } from '@/lib/regras/datas';
import { podeTransferir } from '@/lib/regras/transferencia';
import { inscricaoCompleta } from './consultas';

/**
 * Transferência de inscrição pelo próprio atleta (ou por quem pagou).
 * O número e o valor pago continuam os mesmos; não há cobrança de diferença.
 * Os dados anteriores ficam guardados em `transferencias`.
 */

export { novoParticipanteSchema, type NovoParticipante } from './transferencia-schema';
import { novoParticipanteSchema } from './transferencia-schema';
import { resumoDoErro } from '@/lib/log';

export async function transferirInscricao(usuario: UsuarioAtual, inscricaoId: string, entrada: unknown): Promise<{ ok: true } | { ok: false; erros: string[] }> {
  const dados = await inscricaoCompleta(inscricaoId);
  if (!dados || !podeTransferirInscricao(paraPermissao(usuario), dados.inscricao, dados.pedido, dados.clube.id)) {
    return { ok: false, erros: ['Inscrição não encontrada.'] };
  }
  const { inscricao, evento } = dados;
  if (dados.transferida) return { ok: false, erros: ['Esta inscrição já foi transferida uma vez e não pode ser transferida de novo.'] };
  if (!podeTransferir({ ...inscricao, transferida: dados.transferida }, evento.transferenciaAte, new Date())) {
    return { ok: false, erros: [evento.transferenciaAte ? 'O prazo de transferência deste evento já acabou.' : 'Este evento não permite transferência.'] };
  }

  const parse = novoParticipanteSchema.safeParse(entrada);
  if (!parse.success) return { ok: false, erros: [...new Set(parse.error.issues.map((i) => i.message))] };
  const novo = { ...parse.data, cpf: limparCpf(parse.data.cpf), email: parse.data.email.toLowerCase() };
  const erros: string[] = [];
  if (!validarCpf(novo.cpf)) erros.push('CPF inválido.');
  if (novo.cpf === inscricao.cpf) erros.push('Este CPF já é o da inscrição. Informe o CPF da pessoa que vai receber.');
  if (!nascimentoValido(novo.nascimento, dataLocal(new Date()))) erros.push('Data de nascimento inválida.');
  if (evento.pedeCamisa && !novo.camisa) erros.push('Escolha o tamanho da camisa.');
  if (evento.usaCategoria && !novo.sexo) erros.push('Informe o sexo (este evento tem categoria).');
  if (erros.length) return { ok: false, erros };

  const anteriores = {
    nome: inscricao.nome,
    cpf: inscricao.cpf,
    email: inscricao.email,
    nascimento: inscricao.nascimento,
    sexo: inscricao.sexo,
    telefone: inscricao.telefone,
    camisa: inscricao.camisa,
    contatoEmergencia: inscricao.contatoEmergencia,
    categoria: inscricao.categoria,
  };

  try {
    await db.transaction(async (tx) => {
      // Trava o evento para que duas transferências não usem o mesmo CPF ao mesmo tempo.
      await tx.select({ id: eventos.id }).from(eventos).where(eq(eventos.id, evento.id)).for('update');
      const [atual] = await tx
        .select({ status: inscricoes.status, cpf: inscricoes.cpf, email: inscricoes.email })
        .from(inscricoes)
        .where(eq(inscricoes.id, inscricao.id))
        .for('update');
      if (atual?.status !== 'confirmada') throw new Error('Esta inscrição não está mais ativa.');
      // Com a inscrição travada: só uma transferência, e a permissão conferida de novo com os dados atuais
      // (duas transferências ao mesmo tempo não passam as duas).
      const [jaTransferida] = await tx.select({ id: transferencias.id }).from(transferencias).where(eq(transferencias.inscricaoId, inscricao.id)).limit(1);
      if (jaTransferida) throw new Error('Esta inscrição já foi transferida uma vez e não pode ser transferida de novo.');
      if (!podeTransferirInscricao(paraPermissao(usuario), { cpf: atual.cpf, email: atual.email }, dados.pedido, dados.clube.id)) {
        throw new Error('Esta inscrição não está mais ativa.');
      }
      const [ocupado] = await tx
        .select({ id: inscricoes.id })
        .from(inscricoes)
        .where(and(eq(inscricoes.eventoId, evento.id), eq(inscricoes.cpf, novo.cpf), inArray(inscricoes.status, ['pendente', 'confirmada']), ne(inscricoes.id, inscricao.id)));
      if (ocupado) throw new Error(`O CPF ${formatarCpf(novo.cpf)} já tem inscrição neste evento.`);

      await tx.insert(transferencias).values({ inscricaoId: inscricao.id, dadosAnteriores: anteriores, feitaPor: usuario.id });
      await tx
        .update(inscricoes)
        .set({
          nome: novo.nome,
          cpf: novo.cpf,
          email: novo.email,
          nascimento: novo.nascimento,
          sexo: novo.sexo || null,
          telefone: novo.telefone,
          camisa: evento.pedeCamisa ? (novo.camisa ?? null) : null,
          contatoEmergencia: novo.contatoEmergencia,
          categoria: evento.usaCategoria && novo.sexo ? categoria(novo.nascimento, novo.sexo, dataLocal(evento.dataHora)) : null,
        })
        .where(eq(inscricoes.id, inscricao.id));
    });
  } catch (e) {
    if (e instanceof Error && (e.message.startsWith('O CPF') || e.message.startsWith('Esta inscrição'))) return { ok: false, erros: [e.message] };
    if (typeof e === 'object' && e && 'code' in e && e.code === '23505') return { ok: false, erros: ['Este CPF já tem inscrição neste evento.'] };
    throw e;
  }

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const envios = [
    enviarEmail({
      para: novo.email,
      ...emailTransferenciaRecebida({ evento: evento.nome, data: formatarDataHora(evento.dataHora), nome: novo.nome, distancia: dados.distancia, numero: inscricao.numero, link: `${appUrl}/minhas-inscricoes` }),
    }),
  ];
  if (anteriores.email && anteriores.email !== novo.email) {
    envios.push(enviarEmail({ para: anteriores.email, ...emailTransferenciaEnviada({ evento: evento.nome, nomeAnterior: anteriores.nome, nomeNovo: novo.nome }) }));
  }
  await Promise.allSettled(envios).then((r) => r.forEach((x) => x.status === 'rejected' && console.error('Falha ao enviar e-mail de transferência', resumoDoErro(x.reason))));
  return { ok: true };
}
