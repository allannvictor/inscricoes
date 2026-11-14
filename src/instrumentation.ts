/** Roda uma vez quando o servidor sobe. Liga a proteção de dados pessoais nos logs (veja src/lib/log-protegido.ts). */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { protegerLogs } = await import('./lib/log-protegido');
    protegerLogs();
  }
}
