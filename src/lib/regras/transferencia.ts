/**
 * A inscrição pode ser transferida enquanto estiver confirmada e dentro do prazo definido pelo organizador,
 * e só UMA vez: depois de transferida, ninguém transfere de novo (decisão do Allan em 14/11/2026).
 */
export function podeTransferir(inscricao: { status: string; transferida: boolean }, transferenciaAte: Date | null, agora: Date): boolean {
  if (inscricao.status !== 'confirmada') return false;
  if (inscricao.transferida) return false;
  if (!transferenciaAte) return false;
  return agora.getTime() <= transferenciaAte.getTime();
}
