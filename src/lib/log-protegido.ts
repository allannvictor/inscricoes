import { resumoDoErro } from './log';

/** O valor parece um erro do banco com a consulta e os valores (dados pessoais)? */
export function ehErroComDados(v: unknown): boolean {
  if (!(v instanceof Error)) return false;
  const textos = [v.message, v.cause instanceof Error ? v.cause.message : '', typeof v.stack === 'string' ? v.stack.slice(0, 500) : ''];
  return textos.some((t) => /failed query|params:/i.test(t));
}

/**
 * Rede de segurança dos logs: troca erros do banco (com valores da consulta) pelo resumo sem dados,
 * em qualquer console.error/console.warn, inclusive os que o próprio Next faz (quinta varredura, 14/11/2026).
 */
export function protegerLogs(c: Pick<Console, 'error' | 'warn'> = console): void {
  for (const nivel of ['error', 'warn'] as const) {
    const original = c[nivel].bind(c);
    c[nivel] = (...args: unknown[]) => original(...args.map((a) => (ehErroComDados(a) ? `[erro do banco, sem dados] ${resumoDoErro(a)}` : a)));
  }
}
