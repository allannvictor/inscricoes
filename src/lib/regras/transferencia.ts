/** A inscrição pode ser transferida enquanto estiver confirmada e dentro do prazo definido pelo organizador. */
export function podeTransferir(inscricao: { status: string }, transferenciaAte: Date | null, agora: Date): boolean {
  if (inscricao.status !== 'confirmada') return false;
  if (!transferenciaAte) return false;
  return agora.getTime() <= transferenciaAte.getTime();
}
