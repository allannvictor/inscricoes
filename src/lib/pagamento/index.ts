import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { clubes } from '@/db/schema';
import { cifrar, decifrar } from '@/lib/auth/cripto';
import { criarMercadoPago } from './mercadopago';
import { credenciaisApp, precisaRenovar, renovarToken } from './oauth-mercadopago';
import { provedorSimulado } from './simulado';
import { situacaoDoPagamento, type ClubePagamento, type SituacaoPagamento } from './situacao';
import type { ProvedorPagamento } from './tipos';

export { podePublicarEventos, situacaoDoPagamento, simuladoPermitido } from './situacao';
export type { SituacaoPagamento } from './situacao';

type ClubeComTokens = ClubePagamento & { id: string; mpRefreshToken: string | null; mpTokenExpiraEm: Date | null };

/**
 * Token do Mercado Pago de um clube:
 * - conta conectada pelo próprio clube (OAuth), renovada sozinha quando perto de vencer;
 * - senão, o token do ambiente (MP_ACCESS_TOKEN), SÓ para o clube de MP_CLUBE_DO_TOKEN (padrão: cf-assessoria).
 *   Assim o dinheiro de um clube nunca cai na conta de outro.
 */
async function tokenDoClube(clube: ClubeComTokens): Promise<string | undefined> {
  const situacao: SituacaoPagamento = situacaoDoPagamento(clube);
  if (situacao === 'conectado') {
    let token = decifrar(clube.mpAccessToken);
    const app = credenciaisApp();
    const refresh = decifrar(clube.mpRefreshToken);
    if (token && app && refresh && precisaRenovar(clube.mpTokenExpiraEm)) {
      try {
        const novo = await renovarToken(app, refresh);
        await db
          .update(clubes)
          .set({ mpAccessToken: cifrar(novo.accessToken), mpRefreshToken: novo.refreshToken ? cifrar(novo.refreshToken) : clube.mpRefreshToken, mpTokenExpiraEm: novo.expiraEm })
          .where(eq(clubes.id, clube.id));
        token = novo.accessToken;
      } catch (e) {
        console.error('Mercado Pago: falha ao renovar o token do clube', clube.id, e);
      }
    }
    return token ?? undefined;
  }
  if (situacao === 'ambiente') return process.env.MP_ACCESS_TOKEN;
  return undefined;
}

export async function provedorDoClube(clube: ClubeComTokens): Promise<ProvedorPagamento> {
  const t = await tokenDoClube(clube);
  if (t) return criarMercadoPago(t);
  if (situacaoDoPagamento(clube) === 'simulado') return provedorSimulado;
  throw new Error('Pagamento ainda não configurado para este clube.');
}
