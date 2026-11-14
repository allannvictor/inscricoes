import { describe, expect, it } from 'vitest';
import { resumoDoErro } from './log';

describe('resumoDoErro', () => {
  it('nunca leva valores da consulta do banco (dados pessoais) para o log', () => {
    const erro = Object.assign(new Error('Failed query: insert into "inscricoes" ("nome","cpf") values ($1,$2)\nparams: Ana Atleta,52998224725'), {
      cause: Object.assign(new Error('invalid byte sequence for encoding "UTF8": 0x00'), { code: '22021' }),
    });
    const r = resumoDoErro(erro);
    expect(r).not.toContain('52998224725');
    expect(r).not.toContain('Ana Atleta');
    expect(r).toContain('22021');
  });
  it('erro do Postgres com o valor duplicado na mensagem também fica sem o valor', () => {
    const erro = Object.assign(new Error('x'), { cause: Object.assign(new Error('Key (cpf)=(52998224725) already exists.'), { code: '23505' }) });
    expect(resumoDoErro(erro)).not.toContain('52998224725');
  });
  it('mantém mensagens nossas, que não têm dados', () => {
    expect(resumoDoErro(new Error('O Mercado Pago não respondeu como esperado.'))).toContain('Mercado Pago');
    expect(resumoDoErro('texto')).toBe('erro desconhecido');
  });
});
