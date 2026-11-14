import { describe, expect, it } from 'vitest';
import { ehErroComDados, protegerLogs } from './log-protegido';

describe('rede de segurança dos logs', () => {
  it('troca o erro do banco pelo resumo sem os valores', () => {
    const saida: unknown[][] = [];
    const falso = { error: (...a: unknown[]) => void saida.push(a), warn: (...a: unknown[]) => void saida.push(a) };
    protegerLogs(falso);
    const erro = new Error('Failed query: insert into "socios" values ($1,$2)\nparams: 52998224725,Ana Silva');
    falso.error('Falha', erro);
    expect(JSON.stringify(saida)).not.toContain('52998224725');
    expect(JSON.stringify(saida)).not.toContain('Ana Silva');
    expect(String(saida[0][1])).toContain('sem dados');
  });
  it('deixa os outros registros como estão', () => {
    expect(ehErroComDados(new Error('O Mercado Pago não respondeu.'))).toBe(false);
    expect(ehErroComDados('texto')).toBe(false);
  });
});
