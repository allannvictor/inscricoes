/**
 * Entradas estranhas que davam erro 500 (sexta varredura de segurança, 14/11/2026).
 */
import { describe, expect, it } from 'vitest';
import { dataDoCalendario, dataHoraDoCalendario, nascimentoValido } from './datas';
import { comoObjeto, mensagemDoMapa, textoDoParametro } from './parametros';
import { ehUuid } from './uuid';

describe('ehUuid', () => {
  it('aceita UUID de verdade (maiúsculas também)', () => {
    expect(ehUuid('3f1c2b7a-9d4e-4f6a-8b2c-1d2e3f4a5b6c')).toBe(true);
    expect(ehUuid('3F1C2B7A-9D4E-4F6A-8B2C-1D2E3F4A5B6C')).toBe(true);
    expect(ehUuid('00000000-0000-4000-8000-000000000000')).toBe(true);
  });
  it('recusa 36 hifens e outros formatos que passavam na regra antiga', () => {
    expect(ehUuid('-'.repeat(36))).toBe(false);
    expect(ehUuid('3f1c2b7a9d4e4f6a8b2c1d2e3f4a5b6c----')).toBe(false);
    expect(ehUuid('3f1c2b7a-9d4e-4f6a-8b2c1-d2e3f4a5b6c')).toBe(false);
    expect(ehUuid('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe(false);
  });
  it('recusa o que não é texto e espaços ou quebra de linha no fim', () => {
    expect(ehUuid(undefined)).toBe(false);
    expect(ehUuid(null)).toBe(false);
    expect(ehUuid(['3f1c2b7a-9d4e-4f6a-8b2c-1d2e3f4a5b6c'])).toBe(false);
    expect(ehUuid('3f1c2b7a-9d4e-4f6a-8b2c-1d2e3f4a5b6c\n')).toBe(false);
    expect(ehUuid(' 3f1c2b7a-9d4e-4f6a-8b2c-1d2e3f4a5b6c')).toBe(false);
  });
});

describe('parâmetros da URL', () => {
  const ERROS = { google: 'Falhou o Google.' };
  it('mensagemDoMapa só acha chaves do próprio mapa', () => {
    expect(mensagemDoMapa(ERROS, 'google')).toBe('Falhou o Google.');
    for (const chave of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf']) {
      expect(mensagemDoMapa(ERROS, chave)).toBeUndefined();
    }
    expect(mensagemDoMapa(ERROS, ['google'])).toBeUndefined();
    expect(mensagemDoMapa(ERROS, undefined)).toBeUndefined();
  });
  it('textoDoParametro: lista (?busca=a&busca=b) e outros tipos viram undefined', () => {
    expect(textoDoParametro('ana')).toBe('ana');
    expect(textoDoParametro('')).toBe('');
    expect(textoDoParametro(['a', 'b'])).toBeUndefined();
    expect(textoDoParametro(undefined)).toBeUndefined();
    expect(textoDoParametro(42)).toBeUndefined();
  });
  it('comoObjeto: corpo do webhook que não é objeto vira {}', () => {
    expect(comoObjeto(null)).toEqual({});
    expect(comoObjeto(42)).toEqual({});
    expect(comoObjeto('texto')).toEqual({});
    expect(comoObjeto([1, 2])).toEqual({});
    expect(comoObjeto({ type: 'order' })).toEqual({ type: 'order' });
    expect(comoObjeto(comoObjeto(null).data).id).toBeUndefined();
  });
});

describe('datas do calendário', () => {
  it('aceita datas que existem', () => {
    expect(dataDoCalendario('2026-12-13')).toBe(true);
    expect(dataDoCalendario('2028-02-29')).toBe(true); // ano bissexto
    expect(dataHoraDoCalendario('2026-12-13T05:30')).toBe(true);
    expect(dataHoraDoCalendario('2026-12-13T00:00')).toBe(true);
    expect(dataHoraDoCalendario('2026-12-13T23:59')).toBe(true);
  });
  it('recusa datas e horas que não existem', () => {
    for (const d of ['2026-13-45', '2026-02-30', '2027-02-29', '2026-00-10', '2026-04-31', '2026-1-1', '']) {
      expect(dataDoCalendario(d)).toBe(false);
    }
    for (const d of ['2026-13-45T99:99', '2026-12-13T24:00', '2026-12-13T05:60', '2026-02-30T10:00', '2026-12-13']) {
      expect(dataHoraDoCalendario(d)).toBe(false);
    }
  });
  it('nascimentoValido continua igual', () => {
    expect(nascimentoValido('1990-01-01', '2026-11-14')).toBe(true);
    expect(nascimentoValido('1990-02-30', '2026-11-14')).toBe(false);
  });
});

describe('sétima varredura', () => {
  it('ehSlug: só letras minúsculas, números e hífen', async () => {
    const { ehSlug } = await import('./slug');
    expect(ehSlug('simulado-10k-dezembro')).toBe(true);
    expect(ehSlug('cf-assessoria')).toBe(true);
    for (const v of ['\u0000', 'a\u0000b', '', 'Maiuscula', 'com espaço', 'a/b', '%00', 'a'.repeat(81), undefined, ['cf']]) {
      expect(ehSlug(v)).toBe(false);
    }
  });
  it('lerCookieJson: cookie adulterado vira null', async () => {
    const { lerCookieJson } = await import('./parametros');
    const campos = ['state', 'verificador'] as const;
    expect(lerCookieJson('{"state":"s","verificador":"v","extra":1}', campos)).toEqual({ state: 's', verificador: 'v' });
    for (const bruto of [undefined, '', '5', '"x"', '{}', 'null', '[]', '{"state":1,"verificador":"v"}', '{"state":"s"}', '{"state":"","verificador":"v"}', '{quebrado', 'x'.repeat(5000)]) {
      expect(lerCookieJson(bruto, campos)).toBeNull();
    }
  });
  it('anoDeEvento: só de 2000 a 2100', async () => {
    const { anoDeEvento } = await import('./datas');
    expect(anoDeEvento('2026-12-13')).toBe(true);
    expect(anoDeEvento('2100-12-31T23:30')).toBe(true);
    expect(anoDeEvento('0000-01-01')).toBe(false);
    expect(anoDeEvento('9999-12-31T23:30')).toBe(false);
    expect(anoDeEvento('1999-12-31')).toBe(false);
  });
});
