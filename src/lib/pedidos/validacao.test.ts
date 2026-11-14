import { describe, expect, it } from 'vitest';
import { novoParticipanteSchema } from '@/lib/atleta/transferencia-schema';
import { participanteSchema, pedidoSchema } from './validacao';

const base = {
  distanciaId: '00000000-0000-4000-8000-000000000000',
  nome: 'Ana Atleta',
  cpf: '529.982.247-25',
  email: 'ana@exemplo.invalid',
  nascimento: '1990-01-01',
  sexo: 'F' as const,
  telefone: '(79) 99999-0000',
  camisa: 'M',
  contatoEmergencia: 'Mãe 79988887777',
};

describe('tamanho máximo dos campos (não dá para encher o banco)', () => {
  it('aceita um participante normal', () => {
    expect(participanteSchema.safeParse(base).success).toBe(true);
  });
  it('recusa telefone, camisa, CPF, nascimento ou e-mail gigantes', () => {
    for (const campo of ['telefone', 'camisa', 'cpf', 'nascimento'] as const) {
      expect(participanteSchema.safeParse({ ...base, [campo]: '9'.repeat(400_000) }).success).toBe(false);
    }
    expect(participanteSchema.safeParse({ ...base, email: 'a'.repeat(300) + '@x.com' }).success).toBe(false);
  });
  it('na transferência também', () => {
    const t = { nome: 'Carla', cpf: '111.444.777-35', email: 'carla@exemplo.invalid', nascimento: '1990-01-01', sexo: 'F', telefone: '(79) 99999-0000', camisa: 'M', contatoEmergencia: 'Filho 799' };
    expect(novoParticipanteSchema.safeParse(t).success).toBe(true);
    expect(novoParticipanteSchema.safeParse({ ...t, telefone: '9'.repeat(400_000) }).success).toBe(false);
    expect(novoParticipanteSchema.safeParse({ ...t, email: 'a'.repeat(300) + '@x.com' }).success).toBe(false);
  });
  it('recusa o caractere nulo (o erro do banco levaria dados ao log)', () => {
    expect(participanteSchema.safeParse({ ...base, nome: 'Ana\u0000' }).success).toBe(false);
  });
});

describe('participantes por pedido: você e mais 3 (oitava varredura)', () => {
  const pedido = (n: number) => ({ eventoId: '00000000-0000-4000-8000-000000000000', aceite: true, participantes: Array.from({ length: n }, () => base) });
  it('aceita de 1 a 4 e recusa 5 ou mais', () => {
    expect(pedidoSchema.safeParse(pedido(1)).success).toBe(true);
    expect(pedidoSchema.safeParse(pedido(4)).success).toBe(true);
    const r = pedidoSchema.safeParse(pedido(5));
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/Máximo de 4 participantes por pedido/);
    expect(pedidoSchema.safeParse(pedido(10)).success).toBe(false);
  });
});

describe('cupom do pedido (sexta varredura)', () => {
  const pedido = (cupom?: unknown) => ({ eventoId: '00000000-0000-4000-8000-000000000000', aceite: true, participantes: [base], ...(cupom === undefined ? {} : { cupom }) });
  it('aceita sem cupom, vazio e no formato do painel', () => {
    expect(pedidoSchema.safeParse(pedido()).success).toBe(true);
    expect(pedidoSchema.safeParse(pedido('')).success).toBe(true);
    expect(pedidoSchema.safeParse(pedido('AMIGO10')).success).toBe(true);
    expect(pedidoSchema.safeParse(pedido('amigo_10-x')).success).toBe(true);
  });
  it('recusa o caractere nulo e outros caracteres de controle', () => {
    expect(pedidoSchema.safeParse(pedido('AMIGO\u000010')).success).toBe(false);
    expect(pedidoSchema.safeParse(pedido('\u0000')).success).toBe(false);
    expect(pedidoSchema.safeParse(pedido('AMI\u001bGO')).success).toBe(false);
  });
  it('recusa formatos que nenhum cupom tem (espaço, %, longo demais, tipo errado)', () => {
    expect(pedidoSchema.safeParse(pedido('AMIGO 10')).success).toBe(false);
    expect(pedidoSchema.safeParse(pedido('%')).success).toBe(false);
    expect(pedidoSchema.safeParse(pedido('A'.repeat(31))).success).toBe(false);
    expect(pedidoSchema.safeParse(pedido(['AMIGO10'])).success).toBe(false);
  });
});
