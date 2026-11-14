import { describe, expect, it } from 'vitest';
import { cadastroCompleto, faltasDaPessoa, type DadosPessoa } from './participante';

const hoje = '2026-11-14';
const completo: DadosPessoa = {
  nome: 'Ana Atleta',
  cpf: '52998224725',
  nascimento: '1990-05-10',
  sexo: 'F',
  telefone: '(79) 99999-0000',
  camisa: 'M',
  contatoEmergencia: 'Mãe 79988887777',
};
const comCategoria = { usaCategoria: true, pedeCamisa: true };
const semCategoria = { usaCategoria: false, pedeCamisa: false };

describe('faltasDaPessoa', () => {
  it('cadastro completo não tem faltas', () => {
    expect(faltasDaPessoa(completo, comCategoria, hoje)).toEqual([]);
  });

  it('sexo só é obrigatório em evento com categoria', () => {
    const semSexo = { ...completo, sexo: '' };
    expect(faltasDaPessoa(semSexo, comCategoria, hoje)).toEqual(['sexo']);
    expect(faltasDaPessoa(semSexo, semCategoria, hoje)).toEqual([]);
  });

  it('camisa só é obrigatória quando o evento pede', () => {
    const semCamisa = { ...completo, camisa: '' };
    expect(faltasDaPessoa(semCamisa, comCategoria, hoje)).toEqual(['camisa']);
    expect(faltasDaPessoa(semCamisa, { usaCategoria: true, pedeCamisa: false }, hoje)).toEqual([]);
  });

  it('aponta CPF inválido, nascimento futuro e WhatsApp sem DDD', () => {
    const ruim = { ...completo, cpf: '12345678900', nascimento: '2030-01-01', telefone: '9999-0000' };
    expect(faltasDaPessoa(ruim, semCategoria, hoje)).toEqual(['CPF válido', 'nascimento', 'WhatsApp com DDD']);
  });
});

describe('cadastroCompleto', () => {
  it('depende do que o evento pede', () => {
    expect(cadastroCompleto({ ...completo, sexo: '' }, semCategoria, hoje)).toBe(true);
    expect(cadastroCompleto({ ...completo, sexo: '' }, comCategoria, hoje)).toBe(false);
  });
});
