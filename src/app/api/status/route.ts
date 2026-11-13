import { NextResponse } from 'next/server';
import { codigoTesteAtivo, ehHomologacao } from '@/lib/ambiente';

export const dynamic = 'force-dynamic';

/**
 * Diagnóstico rápido do que está configurado no site publicado.
 * Mostra só SE cada serviço está ligado — nunca valores de tokens ou senhas.
 */
export function GET() {
  return NextResponse.json({
    versao: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    ambiente: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    pagamento: process.env.MP_ACCESS_TOKEN ? 'mercadopago' : 'simulado',
    tipoCredencial: process.env.MP_ACCESS_TOKEN?.startsWith('TEST-') ? 'teste (TEST-)' : process.env.MP_ACCESS_TOKEN ? 'APP_USR (teste ou produção)' : null,
    webhookComAssinatura: !!process.env.MP_WEBHOOK_SECRET,
    email: process.env.RESEND_API_KEY ? 'resend' : 'simulado (só nos logs)',
    simuladoPermitido: process.env.PERMITIR_SIMULADO === '1',
    appUrl: process.env.APP_URL ?? null,
    emBreve: process.env.PRE_LANCAMENTO === '1',
    homologacao: ehHomologacao(),
    codigoDeTesteLigado: !!codigoTesteAtivo(),
  });
}
