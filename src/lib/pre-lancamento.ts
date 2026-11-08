/**
 * Modo "em breve" (pré-lançamento).
 * Ligado com PRE_LANCAMENTO=1: o público vê só a página "em breve".
 * Quem abre qualquer página com ?acesso=<CHAVE_PRE_LANCAMENTO> ganha um cookie e navega normalmente.
 * Webhook do Mercado Pago e /api/status continuam abertos.
 */

export const COOKIE_ACESSO = 'acesso_pre_lancamento';
export const PAGINA_EM_BREVE = '/em-breve';

const SEMPRE_ABERTOS = ['/api/webhooks/', '/api/status', PAGINA_EM_BREVE];

export type Decisao = 'liberar' | 'liberar_e_gravar_cookie' | 'em_breve';

export function decidirAcesso(args: {
  ligado: boolean;
  chave: string | undefined;
  caminho: string;
  acessoNaUrl: string | null;
  cookie: string | undefined;
}): Decisao {
  if (!args.ligado) return 'liberar';
  if (SEMPRE_ABERTOS.some((p) => args.caminho === p || args.caminho.startsWith(p))) return 'liberar';
  if (!args.chave) return 'em_breve'; // sem chave configurada, ninguém passa
  if (args.acessoNaUrl === args.chave) return 'liberar_e_gravar_cookie';
  if (args.cookie === args.chave) return 'liberar';
  return 'em_breve';
}
