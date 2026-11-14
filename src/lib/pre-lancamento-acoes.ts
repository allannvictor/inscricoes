import 'server-only';
import { cookies } from 'next/headers';
import { COOKIE_ACESSO } from './pre-lancamento';

/**
 * Segunda trava do modo "em breve", DENTRO das ações públicas (login, pedido, CPF, cupom).
 * O middleware bloqueia pelos endereços, mas o Next "limpa" alguns endereços antes dele
 * (ex.: /_next/data/<build>/...). Com esta trava, as ações só funcionam para quem tem a chave,
 * venha a requisição por onde vier (quarta varredura de segurança, 14/11/2026).
 */
export async function acaoLiberadaNoPreLancamento(): Promise<boolean> {
  if (process.env.PRE_LANCAMENTO !== '1') return true;
  const chave = process.env.CHAVE_PRE_LANCAMENTO;
  if (!chave) return false;
  return (await cookies()).get(COOKIE_ACESSO)?.value === chave;
}
