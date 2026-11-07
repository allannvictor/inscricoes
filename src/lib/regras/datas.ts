/** Datas sempre no fuso de Brasília. Nascimento é texto 'AAAA-MM-DD'. */

export const FUSO = 'America/Sao_Paulo';

/** Data (AAAA-MM-DD) de um instante, no fuso de Brasília. */
export function dataLocal(instante: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instante);
}

/** Idade completa em anos numa data (AAAA-MM-DD). */
export function idadeEm(nascimento: string, data: string): number {
  const [an, mn, dn] = nascimento.split('-').map(Number);
  const [a, m, d] = data.split('-').map(Number);
  let idade = a - an;
  if (m < mn || (m === mn && d < dn)) idade--;
  return idade;
}

export function nascimentoValido(nascimento: string, hoje: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) return false;
  const dt = new Date(nascimento + 'T12:00:00Z');
  if (Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== nascimento) return false;
  const idade = idadeEm(nascimento, hoje);
  return idade >= 0 && idade <= 110;
}

export function formatarDataHora(instante: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(instante);
}

export function formatarHora(instante: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(instante).replace(':00', 'h').replace(':', 'h');
}

export function formatarDiaMes(instante: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit' }).format(instante);
}
