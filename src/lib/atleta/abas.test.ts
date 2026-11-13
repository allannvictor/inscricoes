import { describe, expect, it } from 'vitest';
import { abaDaInscricao, abaValida, separarEmAbas, type ItemAba } from './abas';

const agora = new Date('2026-11-13T12:00:00Z');
const futura = { id: 'e-futura', dataHora: new Date('2026-12-14T09:00:00Z') };
const maisFutura = { id: 'e-mais-futura', dataHora: new Date('2027-01-20T09:00:00Z') };
const passada = { id: 'e-passada', dataHora: new Date('2026-10-01T09:00:00Z') };
const maisAntiga = { id: 'e-antiga', dataHora: new Date('2026-05-01T09:00:00Z') };

const item = (id: string, status: string, evento: ItemAba['evento']): ItemAba => ({ inscricao: { id, status }, evento });

describe('abaDaInscricao', () => {
  it('prova futura confirmada ou aguardando Pix vai para Inscrito', () => {
    expect(abaDaInscricao(item('1', 'confirmada', futura), agora)).toBe('inscrito');
    expect(abaDaInscricao(item('2', 'pendente', futura), agora)).toBe('inscrito');
  });
  it('cancelada vai para Cancelados, passada ou futura', () => {
    expect(abaDaInscricao(item('1', 'cancelada', futura), agora)).toBe('cancelados');
    expect(abaDaInscricao(item('2', 'cancelada', passada), agora)).toBe('cancelados');
  });
  it('prova passada confirmada vai para Provas passadas; Pix pendente de prova passada some', () => {
    expect(abaDaInscricao(item('1', 'confirmada', passada), agora)).toBe('passadas');
    expect(abaDaInscricao(item('2', 'pendente', passada), agora)).toBeNull();
  });
});

describe('separarEmAbas', () => {
  it('agrupa por prova e ordena cada aba', () => {
    const abas = separarEmAbas(
      [
        item('a', 'confirmada', futura),
        item('b', 'confirmada', futura),
        item('c', 'pendente', maisFutura),
        item('d', 'confirmada', maisAntiga),
        item('e', 'confirmada', passada),
        item('f', 'cancelada', maisAntiga),
        item('g', 'cancelada', futura),
      ],
      agora,
    );
    // Prova com Pix pendente primeiro, mesmo sendo mais distante.
    expect(abas.inscrito.map((g) => g.evento.id)).toEqual(['e-mais-futura', 'e-futura']);
    expect(abas.inscrito[1].itens.map((i) => i.inscricao.id)).toEqual(['a', 'b']);
    expect(abas.passadas.map((g) => g.evento.id)).toEqual(['e-passada', 'e-antiga']);
    expect(abas.cancelados.map((g) => g.evento.id)).toEqual(['e-futura', 'e-antiga']);
  });

  it('dentro da prova, quem aguarda Pix aparece primeiro', () => {
    const abas = separarEmAbas([item('a', 'confirmada', futura), item('b', 'pendente', futura)], agora);
    expect(abas.inscrito[0].itens.map((i) => i.inscricao.id)).toEqual(['b', 'a']);
  });
});

describe('abaValida', () => {
  it('aceita as três abas e cai em Inscrito no resto', () => {
    expect(abaValida('cancelados')).toBe('cancelados');
    expect(abaValida('passadas')).toBe('passadas');
    expect(abaValida('xyz')).toBe('inscrito');
    expect(abaValida(undefined)).toBe('inscrito');
  });
});
