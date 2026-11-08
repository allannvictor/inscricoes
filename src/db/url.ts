/**
 * Qual banco usar.
 * - Produção e máquina local: DATABASE_URL (e DATABASE_URL_UNPOOLED para migrações).
 * - Prévias da Vercel (VERCEL_ENV=preview): SOMENTE DATABASE_URL_PREVIEW, um branch do Neon separado.
 *   Se ela não existir, paramos com erro em vez de usar o banco de produção.
 */
export function urlDoBanco(opcoes: { semPooler?: boolean } = {}): string {
  if (process.env.VERCEL_ENV === 'preview') {
    const url = (opcoes.semPooler && process.env.DATABASE_URL_PREVIEW_UNPOOLED) || process.env.DATABASE_URL_PREVIEW;
    if (!url) {
      throw new Error('Prévia sem DATABASE_URL_PREVIEW. Configure um branch do Neon só para prévias; prévias nunca usam o banco de produção.');
    }
    return url;
  }
  const url = (opcoes.semPooler && process.env.DATABASE_URL_UNPOOLED) || process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não configurada (veja .env.example).');
  return url;
}
