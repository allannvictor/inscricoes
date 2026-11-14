/**
 * Como cada clube recebe (regras puras, testadas em situacao.test.ts):
 * - "conectado": o clube conectou a própria conta Mercado Pago (OAuth).
 * - "ambiente": usa o token do site (MP_ACCESS_TOKEN). Só vale para o clube de MP_CLUBE_DO_TOKEN (padrão: cf-assessoria).
 * - "simulado": sem conta, Pix de mentira. Só fora de produção ou com PERMITIR_SIMULADO=1.
 * - "nao-configurado": sem conta e sem simulado: não dá para cobrar.
 */

export type SituacaoPagamento = 'conectado' | 'ambiente' | 'simulado' | 'nao-configurado';

export interface ClubePagamento {
  slug: string;
  mpAccessToken: string | null;
  mpConectado: boolean;
}

export function simuladoPermitido(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== 'production' || env.PERMITIR_SIMULADO === '1';
}

export function situacaoDoPagamento(clube: ClubePagamento, env: NodeJS.ProcessEnv = process.env): SituacaoPagamento {
  if (clube.mpConectado && clube.mpAccessToken) return 'conectado';
  if (env.MP_ACCESS_TOKEN && clube.slug === (env.MP_CLUBE_DO_TOKEN || 'cf-assessoria')) return 'ambiente';
  return simuladoPermitido(env) ? 'simulado' : 'nao-configurado';
}

/**
 * Um clube só publica evento quando consegue receber de verdade.
 * Fora da produção (homologação, desenvolvimento), o Pix simulado também vale.
 */
export function podePublicarEventos(clube: ClubePagamento, env: NodeJS.ProcessEnv = process.env): boolean {
  const s = situacaoDoPagamento(clube, env);
  if (s === 'conectado' || s === 'ambiente') return true;
  return s === 'simulado' && env.VERCEL_ENV !== 'production';
}
