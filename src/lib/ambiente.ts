/**
 * Em que ambiente o site está rodando.
 * - Produção: VERCEL_ENV=production.
 * - Homologação: VERCEL_ENV=preview (inscricoes-hml.vercel.app).
 * - Desenvolvimento: máquina local (NODE_ENV=development/test).
 */

export function ehHomologacao(): boolean {
  return process.env.VERCEL_ENV === 'preview';
}

export function ehDesenvolvimento(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Código fixo de login para testes (LOGIN_CODIGO_TESTE).
 * Só vale em desenvolvimento e na homologação. Em produção é sempre ignorado.
 */
export function codigoTesteAtivo(): string | null {
  const codigo = process.env.LOGIN_CODIGO_TESTE?.replace(/\D/g, '');
  if (!codigo || codigo.length !== 6) return null;
  if (process.env.VERCEL_ENV === 'production') return null;
  return ehDesenvolvimento() || ehHomologacao() ? codigo : null;
}
