/**
 * Resumo de um erro para o log, SEM dados pessoais (LGPD).
 * Erros do banco (Drizzle) trazem a consulta e os valores ("params": nome, CPF, telefone...) na mensagem;
 * por isso nunca registramos o objeto do erro inteiro. Quarta varredura de segurança, 14/11/2026.
 */
export function resumoDoErro(e: unknown): string {
  if (!e || typeof e !== 'object') return 'erro desconhecido';
  const o = e as { name?: unknown; message?: unknown; code?: unknown; cause?: { code?: unknown; message?: unknown } };
  const partes: string[] = [typeof o.name === 'string' ? o.name : 'Erro'];
  const codigo = o.code ?? o.cause?.code;
  if (codigo != null) partes.push(`código ${String(codigo).slice(0, 20)}`);
  const msg = typeof o.message === 'string' ? o.message : '';
  // Mensagens com consulta ou valores do banco ficam de fora.
  if (msg && !/failed query|params|insert into|update |select |values|=\(/i.test(msg)) partes.push(msg.slice(0, 200));
  else if (typeof o.cause?.message === 'string' && !/key \(|=\(|params/i.test(o.cause.message)) partes.push(o.cause.message.slice(0, 200));
  return partes.join(' · ');
}
