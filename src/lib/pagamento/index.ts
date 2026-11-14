import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { clubes } from '@/db/schema';
import { cifrar, decifrar } from '@/lib/auth/cripto';
import { criarMercadoPago } from './mercadopago';
import { buscarContaMp, credenciaisApp, precisaRenovar, renovarToken, type ContaMp } from './oauth-mercadopago';
import { provedorSimulado } from './simulado';
import { situacaoDoPagamento, type ClubePagamento, type SituacaoPagamento } from './situacao';
import type { ProvedorPagamento } from './tipos';
import { resumoDoErro } from '@/lib/log';

export { podePublicarEventos, podeSimularPagamento, situacaoDoPagamento, simuladoPermitido } from './situacao';
export type { SituacaoPagamento } from './situacao';

type ClubeComTokens = ClubePagamento & { id: string; mpRefreshToken: string | null; mpTokenExpiraEm: Date | null };
type ClubeComConta = ClubeComTokens & { mpContaNome: string | null; mpContaApelido: string | null; mpContaEmail: string | null };

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
        console.error('Mercado Pago: falha ao renovar o token do clube', clube.id, resumoDoErro(e));
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

/**
 * Quem é a conta que recebe os Pix do clube (nome, apelido e e-mail mascarado), para a tela de Pagamento.
 * - Conta conectada: guardada na conexão. Clubes conectados antes desta mudança são buscados uma vez e guardados.
 * - Token do site (MP_ACCESS_TOKEN, só o clube de MP_CLUBE_DO_TOKEN): buscado na hora, sem guardar.
 * Falha na consulta devolve null: a tela continua funcionando, só sem o nome.
 */
export async function contaMpDoClube(clube: ClubeComConta): Promise<ContaMp | null> {
  const situacao = situacaoDoPagamento(clube);
  if (situacao === 'conectado') {
    if (clube.mpContaNome || clube.mpContaApelido || clube.mpContaEmail) {
      return { nome: clube.mpContaNome, apelido: clube.mpContaApelido, emailMascarado: clube.mpContaEmail };
    }
    const token = await tokenDoClube(clube);
    const conta = token ? await buscarContaMp(token) : null;
    if (conta) {
      await db.update(clubes).set({ mpContaNome: conta.nome, mpContaApelido: conta.apelido, mpContaEmail: conta.emailMascarado }).where(eq(clubes.id, clube.id));
    }
    return conta;
  }
  if (situacao === 'ambiente' && process.env.MP_ACCESS_TOKEN) return buscarContaMp(process.env.MP_ACCESS_TOKEN);
  return null;
}
