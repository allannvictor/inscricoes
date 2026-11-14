import type { RefinementCtx } from 'zod';

/**
 * Recusa o caractere nulo (\u0000) em qualquer campo de texto: o Postgres não aceita, e o erro do banco
 * levaria os dados do formulário para o log (quarta varredura de segurança, 14/11/2026).
 */
export function semCaractereNulo(obj: Record<string, unknown>, ctx: RefinementCtx): void {
  for (const [campo, valor] of Object.entries(obj)) {
    if (typeof valor === 'string' && valor.includes('\u0000')) ctx.addIssue({ code: 'custom', path: [campo], message: 'Há um caractere inválido no texto.' });
  }
}
