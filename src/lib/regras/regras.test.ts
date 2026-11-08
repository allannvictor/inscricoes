import { describe, expect, it } from 'vitest';
import { formatarCpf, limparCpf, mascararCpf, validarCpf } from './cpf';
import { idadeEm, nascimentoValido } from './datas';
import { categoria } from './categoria';
import { ehIdoso, formatarReais, precoParticipante } from './preco';
import { aplicarCupom } from './cupom';
import { calcularPedido } from './pedido';
import { podeTransferir } from './transferencia';

describe('CPF', () => {
  it('valida dígitos verificadores', () => {
    expect(validarCpf('529.982.247-25')).toBe(true);
    expect(validarCpf('52998224725')).toBe(true);
    expect(validarCpf('529.982.247-24')).toBe(false);
    expect(validarCpf('111.111.111-11')).toBe(false);
    expect(validarCpf('123')).toBe(false);
  });
  it('formata, limpa e mascara', () => {
    expect(limparCpf('529.982.247-25')).toBe('52998224725');
    expect(formatarCpf('52998224725')).toBe('529.982.247-25');
    expect(mascararCpf('52998224725')).toBe('***.982.247-**');
  });
});

describe('Idade e categoria', () => {
  it('conta aniversário corretamente', () => {
    expect(idadeEm('1966-12-13', '2026-12-12')).toBe(59);
    expect(idadeEm('1966-12-13', '2026-12-13')).toBe(60);
  });
  it('categoria pela idade no dia da prova', () => {
    expect(categoria('1988-04-12', 'F', '2026-12-13')).toBe('Feminino 30–39');
    expect(categoria('1966-01-01', 'M', '2026-12-13')).toBe('Masculino 60+');
    expect(categoria('2010-01-01', 'M', '2026-12-13')).toBe('Masculino até 17');
  });
  it('rejeita nascimentos impossíveis', () => {
    expect(nascimentoValido('1990-02-30', '2026-11-07')).toBe(false);
    expect(nascimentoValido('2030-01-01', '2026-11-07')).toBe(false);
    expect(nascimentoValido('1990-02-28', '2026-11-07')).toBe(true);
  });
});

describe('Preço', () => {
  const dez = { precoCentavos: 6000, precoSocioCentavos: 4500 };
  const hoje = '2026-11-07';
  it('preço cheio', () => {
    expect(precoParticipante(dez, { precoSocioAtivo: true, ehSocio: false, nascimento: '1990-01-01', dataInscricao: hoje })).toEqual({ valor: 6000, motivo: null });
  });
  it('sócio com preço de sócio ligado', () => {
    expect(precoParticipante(dez, { precoSocioAtivo: true, ehSocio: true, nascimento: '1990-01-01', dataInscricao: hoje })).toEqual({ valor: 4500, motivo: 'socio' });
  });
  it('sócio paga cheio quando o evento não tem preço de sócio', () => {
    expect(precoParticipante(dez, { precoSocioAtivo: false, ehSocio: true, nascimento: '1990-01-01', dataInscricao: hoje })).toEqual({ valor: 6000, motivo: null });
  });
  it('60+ paga meia do preço cheio', () => {
    expect(precoParticipante(dez, { precoSocioAtivo: false, ehSocio: false, nascimento: '1960-05-05', dataInscricao: hoje })).toEqual({ valor: 3000, motivo: 'meia60' });
  });
  it('sócio 60+ fica com o menor (não acumula)', () => {
    expect(precoParticipante(dez, { precoSocioAtivo: true, ehSocio: true, nascimento: '1960-05-05', dataInscricao: hoje })).toEqual({ valor: 3000, motivo: 'meia60' });
    const socioBarato = { precoCentavos: 6000, precoSocioCentavos: 2000 };
    expect(precoParticipante(socioBarato, { precoSocioAtivo: true, ehSocio: true, nascimento: '1960-05-05', dataInscricao: hoje })).toEqual({ valor: 2000, motivo: 'socio' });
  });
  it('meia conta a idade na data da inscrição', () => {
    expect(ehIdoso('1966-11-08', '2026-11-07')).toBe(false);
    expect(ehIdoso('1966-11-07', '2026-11-07')).toBe(true);
  });
  it('meia de valor ímpar arredonda para baixo', () => {
    expect(precoParticipante({ precoCentavos: 5001, precoSocioCentavos: null }, { precoSocioAtivo: false, ehSocio: false, nascimento: '1950-01-01', dataInscricao: hoje }).valor).toBe(2500);
  });
  it('formata reais', () => {
    expect(formatarReais(123456)).toBe('R$ 1.234,56');
    expect(formatarReais(4500)).toBe('R$ 45,00');
  });
});

describe('Cupom', () => {
  it('percentual só em quem paga cheio', () => {
    const r = aplicarCupom([{ valor: 6000, motivo: null }, { valor: 4500, motivo: 'socio' as const }], { tipo: 'percentual', valor: 10 });
    expect(r.desconto).toBe(600);
    expect(r.itens).toEqual([{ valor: 5400, motivo: 'cupom' }, { valor: 4500, motivo: 'socio' }]);
  });
  it('não aplica quando ninguém paga cheio', () => {
    const r = aplicarCupom([{ valor: 3000, motivo: 'meia60' as const }], { tipo: 'percentual', valor: 10 });
    expect(r.desconto).toBe(0);
  });
  it('valor fixo dividido e sem negativos', () => {
    const r = aplicarCupom([{ valor: 5000, motivo: null }, { valor: 5000, motivo: null }], { tipo: 'valor', valor: 1000 });
    expect(r.desconto).toBe(1000);
    expect(r.itens.map((i) => i.valor)).toEqual([4500, 4500]);
    const grande = aplicarCupom([{ valor: 500, motivo: null }], { tipo: 'valor', valor: 1000 });
    expect(grande.desconto).toBe(500);
    expect(grande.itens[0].valor).toBe(0);
  });
});

describe('Pedido completo', () => {
  it('soma participantes com regras diferentes', () => {
    const r = calcularPedido({
      participantes: [
        { distanciaId: 'd10', cpf: '529.982.247-25', nascimento: '1988-04-12', sexo: 'F' },
        { distanciaId: 'd10', cpf: '111.444.777-35', nascimento: '1958-03-02', sexo: 'M' },
        { distanciaId: 'd5', cpf: '935.411.347-80', nascimento: '1995-01-01', sexo: 'M' },
      ],
      distancias: [
        { id: 'd5', precoCentavos: 5000, precoSocioCentavos: 4000 },
        { id: 'd10', precoCentavos: 6000, precoSocioCentavos: 4500 },
      ],
      precoSocioAtivo: true,
      usaCategoria: true,
      cpfsSocios: new Set(['52998224725']),
      cupom: { tipo: 'percentual', valor: 10 },
      dataInscricao: '2026-11-07',
      dataEvento: '2026-12-13',
    });
    expect(r.itens.map((i) => [i.valor, i.motivo])).toEqual([
      [4500, 'socio'],
      [3000, 'meia60'],
      [4500, 'cupom'],
    ]);
    expect(r.subtotal).toBe(12500);
    expect(r.desconto).toBe(500);
    expect(r.total).toBe(12000);
    expect(r.itens[1].categoria).toBe('Masculino 60+');
  });
});

describe('Transferência', () => {
  const prazo = new Date('2026-12-06T23:59:59-03:00');
  it('dentro do prazo e confirmada', () => {
    expect(podeTransferir({ status: 'confirmada' }, prazo, new Date('2026-12-01T10:00:00-03:00'))).toBe(true);
  });
  it('fora do prazo, pendente ou sem prazo', () => {
    expect(podeTransferir({ status: 'confirmada' }, prazo, new Date('2026-12-07T00:00:01-03:00'))).toBe(false);
    expect(podeTransferir({ status: 'pendente' }, prazo, new Date('2026-12-01T10:00:00-03:00'))).toBe(false);
    expect(podeTransferir({ status: 'confirmada' }, null, new Date('2026-12-01T10:00:00-03:00'))).toBe(false);
  });
});
