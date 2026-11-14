/**
 * Como cada clube recebe (regras puras, testadas em situacao.test.ts):
 * - "conectado": o clube conectou a própria conta Mercado Pago (OAuth).
 * - "ambiente": usa o token do site (MP_ACCESS_TOKEN). Só vale para o clube de MP_CLUBE_DO_TOKEN (padrão: cf-assessoria).
 * - "simulado": sem conta, Pix de mentira. Só fora da produção da Vercel (local, CI, homologação).
 *   Em produção (VERCEL_ENV=production) NUNCA, nem com PERMITIR_SIMULADO=1: senão quem compra poderia
 *   "simular" o próprio Pix e se inscrever de graça.
 * - "nao-configurado": sem conta e sem simulado: não dá para cobrar.
 */

export type SituacaoPagamento = 'conectado' | 'ambiente' | 'simulado' | 'nao-configurado';

export interface ClubePagamento {
  slug: string;
  mpAccessToken: string | null;
  mpConectado: boolean;
}

export function simuladoPermitido(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VERCEL_ENV === 'production') return false;
  return env.NODE_ENV !== 'production' || env.PERMITIR_SIMULADO === '1';
}

export function situacaoDoPagamento(clube: ClubePagamento, env: NodeJS.ProcessEnv = process.env): SituacaoPagamento {
  if (clube.mpConectado && clube.mpAccessToken) return 'conectado';
  if (env.MP_ACCESS_TOKEN && clube.slug === (env.MP_CLUBE_DO_TOKEN || 'cf-assessoria')) return 'ambiente';
  return simuladoPermitido(env) ? 'simulado' : 'nao-configurado';
}

/**
 * O botão "Simular Pix recebido" (modo teste) só confirma um pedido quando TUDO isto vale
 * (sexta varredura de segurança, 14/11/2026):
 * - o pedido ainda aguarda o Pix (pendente): expirado ou cancelado não volta a valer de graça;
 * - o Pix dele foi criado pelo provedor simulado (o provisório "criando" não serve);
 * - o clube, AGORA, está no modo simulado. Um clube que conectou uma conta real depois do pedido
 *   não pode ter inscrição confirmada sem pagamento;
 * - o ambiente permite o simulado (nunca em produção).
 */
export function podeSimularPagamento(
  pedido: { status: string; provedor: string },
  clube: ClubePagamento,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return pedido.status === 'pendente' && pedido.provedor === 'simulado' && simuladoPermitido(env) && situacaoDoPagamento(clube, env) === 'simulado';
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
