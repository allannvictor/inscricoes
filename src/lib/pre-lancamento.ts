/**
 * Modo "em breve" (pré-lançamento).
 * Ligado com PRE_LANCAMENTO=1: o público vê só a página "em breve".
 * Quem abre qualquer página com ?acesso=<CHAVE_PRE_LANCAMENTO> ganha um cookie e navega normalmente.
 * Webhook do Mercado Pago e /api/status continuam abertos. A página "em breve" só abre para leitura (GET):
 * um envio (POST) para ela executaria as ações do site (varredura de segurança de 14/11/2026).
 */

export const COOKIE_ACESSO = 'acesso_pre_lancamento';
export const PAGINA_EM_BREVE = '/em-breve';

// Só o endereço EXATO do webhook: qualquer endereço inventado sob /api/webhooks/ cairia na página
// "não encontrado", que executa as ações do site (terceira varredura de segurança, 14/11/2026).
const ABERTOS_EXATOS = ['/api/webhooks/mercadopago'];
const ABERTOS_SO_LEITURA = ['/api/status', PAGINA_EM_BREVE];

export type Decisao = 'liberar' | 'liberar_e_gravar_cookie' | 'em_breve';

export function decidirAcesso(args: {
  ligado: boolean;
  chave: string | undefined;
  caminho: string;
  /** Método HTTP (GET, POST...). Sem ele, vale como GET. */
  metodo?: string;
  acessoNaUrl: string | null;
  cookie: string | undefined;
}): Decisao {
  if (!args.ligado) return 'liberar';
  if (ABERTOS_EXATOS.includes(args.caminho)) return 'liberar';
  const leitura = !args.metodo || args.metodo === 'GET' || args.metodo === 'HEAD';
  if (leitura && ABERTOS_SO_LEITURA.includes(args.caminho)) return 'liberar';
  if (!args.chave) return 'em_breve'; // sem chave configurada, ninguém passa
  if (args.acessoNaUrl === args.chave) return 'liberar_e_gravar_cookie';
  if (args.cookie === args.chave) return 'liberar';
  return 'em_breve';
}
