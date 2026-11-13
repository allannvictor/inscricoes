'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { usuarios } from '@/db/schema';
import { transferirInscricao } from '@/lib/atleta/transferencia';
import { usuarioAtual } from '@/lib/auth/sessao';
import { limparCpf, validarCpf } from '@/lib/regras/cpf';
import { dataLocal, nascimentoValido } from '@/lib/regras/datas';

export async function transferirInscricaoAcao(inscricaoId: string, dados: unknown): Promise<{ ok: true } | { ok: false; erros: string[] }> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erros: ['Sua sessão expirou. Entre de novo.'] };
  try {
    const r = await transferirInscricao(usuario, inscricaoId, dados);
    if (r.ok) revalidatePath('/minhas-inscricoes');
    return r;
  } catch (e) {
    console.error(e);
    return { ok: false, erros: ['Algo deu errado na transferência. Tente de novo.'] };
  }
}

const meusDadosSchema = z.object({
  nome: z.string().trim().max(200),
  cpf: z.string().trim(),
  nascimento: z.string().trim(),
  sexo: z.enum(['F', 'M', '']),
  telefone: z.string().trim().max(30),
  camisa: z.string().trim().max(5),
  contatoEmergencia: z.string().trim().max(200),
});

export async function salvarMeusDadosAcao(dados: z.input<typeof meusDadosSchema>): Promise<{ ok: true } | { ok: false; erros: string[] }> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erros: ['Sua sessão expirou. Entre de novo.'] };
  const parse = meusDadosSchema.safeParse(dados);
  if (!parse.success) return { ok: false, erros: ['Confira os dados.'] };
  const d = parse.data;
  const cpf = limparCpf(d.cpf);
  const erros: string[] = [];
  if (cpf && !validarCpf(cpf)) erros.push('CPF inválido.');
  if (d.nascimento && !nascimentoValido(d.nascimento, dataLocal(new Date()))) erros.push('Data de nascimento inválida.');
  if (erros.length) return { ok: false, erros };
  await db
    .update(usuarios)
    .set({
      nome: d.nome || null,
      cpf: cpf || null,
      nascimento: d.nascimento || null,
      sexo: d.sexo || null,
      telefone: d.telefone || null,
      camisa: d.camisa || null,
      contatoEmergencia: d.contatoEmergencia || null,
    })
    .where(eq(usuarios.id, usuario.id));
  revalidatePath('/minhas-inscricoes');
  return { ok: true };
}
