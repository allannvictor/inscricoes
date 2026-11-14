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

/** "AAAA-MM-DD" que existe no calendário (recusa "2026-02-30" e "2026-13-45"). */
export function dataDoCalendario(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const dt = new Date(valor + 'T12:00:00Z');
  return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === valor;
}

/** "AAAA-MM-DDTHH:MM" com data do calendário e hora entre 00:00 e 23:59. */
export function dataHoraDoCalendario(valor: string): boolean {
  const m = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d$/.exec(valor);
  return !!m && dataDoCalendario(m[1]);
}

export function nascimentoValido(nascimento: string, hoje: string): boolean {
  if (!dataDoCalendario(nascimento)) return false;
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

/** Quantos dias de calendário (Brasília) faltam do dia de hoje até o dia do evento. 0 = é hoje; negativo = já passou. */
export function diasAte(evento: Date, agora: Date): number {
  const dia = (d: Date) => Date.parse(dataLocal(d) + 'T00:00:00Z');
  return Math.round((dia(evento) - dia(agora)) / 86_400_000);
}

/** Texto curto para o selo de contagem: "é hoje", "amanhã", "faltam 12 dias". Vazio se já passou. */
export function textoFaltam(evento: Date, agora: Date): string {
  const n = diasAte(evento, agora);
  if (n < 0) return '';
  if (n === 0) return 'é hoje';
  if (n === 1) return 'amanhã';
  return `faltam ${n} dias`;
}
