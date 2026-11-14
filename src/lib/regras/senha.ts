/** Regras da senha opcional (o login por código no e-mail continua valendo). */
export const SENHA_MINIMO = 8;
export const SENHA_MAXIMO = 128;

export function problemaDaSenha(senha: string, email?: string): string | null {
  if (senha.length < SENHA_MINIMO) return `A senha precisa ter pelo menos ${SENHA_MINIMO} caracteres.`;
  if (senha.length > SENHA_MAXIMO) return `A senha pode ter no máximo ${SENHA_MAXIMO} caracteres.`;
  if (/^(.)\1+$/.test(senha)) return 'Escolha uma senha menos óbvia (não repita o mesmo caractere).';
  if (/^(0123456789|12345678|123456789|87654321|senha123|password|qwertyui)/i.test(senha)) return 'Essa senha é muito comum. Escolha outra.';
  if (email && senha.toLowerCase() === email.trim().toLowerCase()) return 'A senha não pode ser o seu e-mail.';
  return null;
}
