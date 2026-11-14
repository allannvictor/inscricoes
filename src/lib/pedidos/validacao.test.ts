import { describe, expect, it } from 'vitest';
import { novoParticipanteSchema } from '@/lib/atleta/transferencia-schema';
import { participanteSchema } from './validacao';

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
});
