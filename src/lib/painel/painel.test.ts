import { describe, expect, it } from 'vitest';
import { gerarSlug } from '@/lib/regras/slug';
import { lerListaSocios } from './socios-lista';
import { gerarCsv } from './planilha';
import { conferirEvento, dataHoraBrasilia, eventoFormSchema, paraCentavos, paraInputDataHora } from './evento-form';

describe('Slug do evento', () => {
  it('tira acentos e símbolos', () => {
    expect(gerarSlug('Simulado 10K de Dezembro!')).toBe('simulado-10k-de-dezembro');
    expect(gerarSlug('Corrida São João — 2027')).toBe('corrida-sao-joao-2027');
    expect(gerarSlug('!!!')).toBe('evento');
  });
});

describe('Lista de sócios colada', () => {
  it('aceita ; tab e vírgula, ignora cabeçalho, junta repetidos e aponta inválidos', () => {
    const r = lerListaSocios('CPF;Nome\n529.982.247-25;Marina Costa\n11144477735\tRafael Lima\n111.444.777-35, Rafael L.\n123.456.789-00;Errado\n\n');
    expect(r.validos).toEqual([
      { cpf: '52998224725', nome: 'Marina Costa' },
      { cpf: '11144477735', nome: 'Rafael L.' },
    ]);
    expect(r.invalidas).toEqual(['123.456.789-00;Errado']);
  });
});

describe('Planilha CSV', () => {
  it('usa ; tem BOM, aspas quando preciso e neutraliza fórmulas', () => {
    const csv = gerarCsv(['Nome', 'Obs'], [['Ana; Maria', '=1+1'], ['João "Jota"', null]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"Ana; Maria";\'=1+1');
    expect(csv).toContain('"João ""Jota""";');
  });
});

describe('Formulário de evento', () => {
  const base = {
    nome: 'Simulado 5K',
    dataHora: '2027-01-17T06:00',
    local: 'Orla',
    inscricoesAte: '2027-01-14',
    transferenciaAte: '2027-01-10',
    precoSocioAtivo: true,
    pedeCamisa: true,
    usaCategoria: true,
    distancias: [{ nome: '5 km', preco: '50,00', precoSocio: '40', vagas: '' }],
  };
  it('aceita preços com vírgula e converte para centavos', () => {
    const r = eventoFormSchema.parse(base);
    expect(paraCentavos(r.distancias[0].preco)).toBe(5000);
    expect(paraCentavos(r.distancias[0].precoSocio)).toBe(4000);
    expect(conferirEvento(r)).toEqual([]);
  });
  it('aceita R$ e milhar', () => {
    const r = eventoFormSchema.parse({ ...base, distancias: [{ nome: 'Maratona', preco: 'R$ 1.250,50', precoSocio: '', vagas: '100' }] });
    expect(paraCentavos(r.distancias[0].preco)).toBe(125050);
  });
  it('recusa inscrição depois da largada e sócio mais caro', () => {
    const r = eventoFormSchema.parse({ ...base, inscricoesAte: '2027-01-18', distancias: [{ nome: '5 km', preco: '50', precoSocio: '60', vagas: '' }] });
    const erros = conferirEvento(r);
    expect(erros).toContain('As inscrições precisam terminar antes da largada.');
    expect(erros.some((e) => e.includes('preço de sócio'))).toBe(true);
  });
  it('recusa datas que não existem, sem erro 500 (sexta varredura)', () => {
    const r = eventoFormSchema.parse({ ...base, dataHora: '2026-13-45T99:99', inscricoesAte: '2026-02-30', transferenciaAte: '2026-04-31' });
    expect(conferirEvento(r)).toEqual([
      'Data ou hora da largada inválida.',
      'Data de fim das inscrições inválida.',
      'Data de fim das transferências inválida.',
    ]);
    const s = eventoFormSchema.parse({ ...base, dataHora: '2027-01-17T24:00' });
    expect(conferirEvento(s)).toEqual(['Data ou hora da largada inválida.']);
  });
  it('recusa anos fora de 2000 a 2100 (ano 0000 e fim de 9999 davam erro 500; sétima varredura)', () => {
    const r = eventoFormSchema.parse({ ...base, dataHora: '0000-01-02T10:00', inscricoesAte: '0000-01-01', transferenciaAte: '' });
    expect(conferirEvento(r)).toEqual(['Data ou hora da largada inválida.', 'Data de fim das inscrições inválida.']);
    const s = eventoFormSchema.parse({ ...base, dataHora: '9999-12-31T23:30', inscricoesAte: '9999-12-30', transferenciaAte: '9999-12-29' });
    expect(conferirEvento(s)).toHaveLength(3);
  });
  it('datas em Brasília ida e volta', () => {
    const d = dataHoraBrasilia('2027-01-17T06:00');
    expect(d.toISOString()).toBe('2027-01-17T09:00:00.000Z');
    expect(paraInputDataHora(d)).toBe('2027-01-17T06:00');
  });
});
