import type { RefinementCtx } from 'zod';

/** Caracteres de controle (inclui o nulo). Não servem em nenhum campo de uma linha (e-mail, código, CPF). */
export const CONTROLE = /[\u0000-\u001f\u007f]/;

/**
 * Recusa o caractere nulo (\u0000) em qualquer campo de texto, inclusive dentro de listas e objetos.
 * O Postgres não aceita, e o erro do banco levaria os dados do formulário para o log
 * (quarta e quinta varreduras de segurança, 14/11/2026). Quebras de linha continuam valendo (ex.: descrição).
 */
export function semCaractereNulo(obj: unknown, ctx: RefinementCtx): void {
  const visitar = (valor: unknown, caminho: Array<string | number>): void => {
    if (typeof valor === 'string') {
      if (valor.includes('\u0000')) ctx.addIssue({ code: 'custom', path: caminho, message: 'Há um caractere inválido no texto.' });
    } else if (Array.isArray(valor)) {
      valor.forEach((v, i) => visitar(v, [...caminho, i]));
    } else if (valor && typeof valor === 'object') {
      for (const [k, v] of Object.entries(valor)) visitar(v, [...caminho, k]);
    }
  };
  visitar(obj, []);
}
