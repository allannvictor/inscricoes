import 'server-only';
import { criarMercadoPago } from './mercadopago';
import { provedorSimulado } from './simulado';
import type { ProvedorPagamento } from './tipos';

/**
 * Escolhe o provedor de pagamento de um clube.
 * Etapa 1: token da conta do clube em MP_ACCESS_TOKEN. Etapa 2: token salvo pelo OAuth (clubes.mp_access_token).
 * Sem token: modo simulado, permitido só fora de produção ou com PERMITIR_SIMULADO=1 (prévias de teste).
 */
function token(clube: { mpAccessToken: string | null }): string | undefined {
  return clube.mpAccessToken || process.env.MP_ACCESS_TOKEN || undefined;
}

export function simuladoPermitido(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.PERMITIR_SIMULADO === '1';
}

export function modoSimulado(clube: { mpAccessToken: string | null }): boolean {
  return !token(clube);
}

export function provedorDoClube(clube: { mpAccessToken: string | null }): ProvedorPagamento {
  const t = token(clube);
  if (t) return criarMercadoPago(t);
  if (simuladoPermitido()) return provedorSimulado;
  throw new Error('Pagamento ainda não configurado para este clube.');
}
