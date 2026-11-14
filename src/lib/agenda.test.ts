import { describe, expect, it } from 'vitest';
import { escaparIcs, gerarIcs, linkMapa, linkWhatsappCompartilhar } from './agenda';
import { diasAte, textoFaltam } from './regras/datas';

describe('agenda e links', () => {
  it('gera o .ics com início, fim (3h) e textos escapados', () => {
    const ics = gerarIcs({
      id: 'abc',
      nome: 'Simuladão, da CF',
      inicio: new Date('2027-10-10T07:00:00Z'),
      local: 'Pulse; Aracaju',
      url: 'https://exemplo.com/eventos/x',
      agora: new Date('2026-11-14T00:00:00Z'),
    });
    expect(ics).toContain('DTSTART:20271010T070000Z');
    expect(ics).toContain('DTEND:20271010T100000Z');
    expect(ics).toContain('SUMMARY:Simuladão\\, da CF');
    expect(ics).toContain('LOCATION:Pulse\\; Aracaju');
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
  });

  it('não deixa injetar linhas no calendário (CR sozinho, LF, ponto e vírgula) (oitava varredura)', () => {
    const ics = gerarIcs({
      id: 'abc',
      nome: 'Corrida\rBEGIN:VALARM\rDESCRIPTION:Pague em site-falso.com\rEND:VALARM',
      inicio: new Date('2027-10-10T07:00:00Z'),
      local: 'Orla\nURL:https://site-falso.com\u2028X',
      url: 'https://exemplo.com/eventos/x',
      agora: new Date('2026-11-14T00:00:00Z'),
    });
    const linhas = ics.split('\r\n');
    // Só as linhas do próprio arquivo; nenhuma linha começa com o que veio do organizador.
    expect(linhas.filter((l) => l.startsWith('BEGIN:VALARM'))).toEqual([]);
    expect(linhas.filter((l) => l.startsWith('URL:'))).toEqual(['URL:https://exemplo.com/eventos/x']);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n\u2028]/); // nada de \r, \n ou separador de linha soltos
    expect(escaparIcs('a;b,c\\d\r\ne')).toBe('a\\;b\\,c\\\\d\\ne');
  });

  it('monta os links de mapa e WhatsApp', () => {
    expect(linkMapa('Pulse CT, Aracaju')).toBe('https://www.google.com/maps/search/?api=1&query=Pulse%20CT%2C%20Aracaju');
    expect(linkWhatsappCompartilhar('Corrida', 'https://x.com')).toBe('https://wa.me/?text=Corrida%0Ahttps%3A%2F%2Fx.com');
  });
});

describe('dias até o evento (fuso de Brasília)', () => {
  const agora = new Date('2026-11-14T23:30:00-03:00');
  it('conta dias de calendário', () => {
    expect(diasAte(new Date('2026-11-14T05:00:00-03:00'), agora)).toBe(0);
    expect(diasAte(new Date('2026-11-15T05:00:00-03:00'), agora)).toBe(1);
    expect(diasAte(new Date('2026-11-24T05:00:00-03:00'), agora)).toBe(10);
    expect(diasAte(new Date('2026-11-13T05:00:00-03:00'), agora)).toBe(-1);
  });
  it('texto do selo', () => {
    expect(textoFaltam(new Date('2026-11-14T05:00:00-03:00'), agora)).toBe('é hoje');
    expect(textoFaltam(new Date('2026-11-15T05:00:00-03:00'), agora)).toBe('amanhã');
    expect(textoFaltam(new Date('2026-11-24T05:00:00-03:00'), agora)).toBe('faltam 10 dias');
    expect(textoFaltam(new Date('2026-11-13T05:00:00-03:00'), agora)).toBe('');
  });
});
