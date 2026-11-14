/**
 * Quem pode ver o quê. Regras puras (sem banco) para serem testadas.
 * As páginas carregam os dados e perguntam aqui; se a resposta for "não", mostram 404.
 */

export interface UsuarioLogado {
  id: string;
  email: string;
  cpf: string | null;
  clubesOrganizados: string[]; // ids de clubes em que é organizador
  /** Usuário master da plataforma (e-mail em ADMIN_EMAILS): acessa o painel de qualquer clube. */
  admin?: boolean;
}

/** Lista de e-mails master, vinda da variável ADMIN_EMAILS (separados por vírgula). */
export function ehEmailAdmin(email: string, adminEmails: string | undefined): boolean {
  const lista = (adminEmails ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return lista.includes(email.trim().toLowerCase());
}

/** Organizador do clube (pode tudo nos eventos dele) ou master. */
export function ehOrganizadorDoClube(usuario: UsuarioLogado | null, clubeId: string): boolean {
  return !!usuario && (usuario.admin === true || usuario.clubesOrganizados.includes(clubeId));
}

/** Pode abrir o painel (organizador de algum clube ou master)? */
export function podeAbrirPainel(usuario: UsuarioLogado | null): boolean {
  return !!usuario && (usuario.admin === true || usuario.clubesOrganizados.length > 0);
}

/** Pedido: só o comprador ou um organizador do clube dono do evento. */
export function podeVerPedido(usuario: UsuarioLogado | null, pedido: { compradorId: string }, clubeIdDoEvento: string): boolean {
  if (!usuario) return false;
  return pedido.compradorId === usuario.id || ehOrganizadorDoClube(usuario, clubeIdDoEvento);
}

/**
 * Inscrição: comprador, o próprio participante ou organizador do clube.
 * O participante é reconhecido SÓ pelo e-mail da inscrição, que é comprovado no login.
 * O CPF NÃO dá acesso: ele não é segredo, e qualquer um poderia digitar o CPF de outra pessoa em Meus dados
 * (falha encontrada na varredura de segurança de 14/11/2026).
 */
export function podeVerInscricao(
  usuario: UsuarioLogado | null,
  inscricao: { cpf: string; email: string | null },
  pedido: { compradorId: string },
  clubeIdDoEvento: string,
): boolean {
  if (!usuario) return false;
  if (pedido.compradorId === usuario.id || ehOrganizadorDoClube(usuario, clubeIdDoEvento)) return true;
  return !!inscricao.email && inscricao.email.toLowerCase() === usuario.email.toLowerCase();
}

/** Transferir: quem pode ver a inscrição (comprador, o próprio participante ou organizador do clube). O prazo é conferido à parte. */
export function podeTransferirInscricao(
  usuario: UsuarioLogado | null,
  inscricao: { cpf: string; email: string | null },
  pedido: { compradorId: string },
  clubeIdDoEvento: string,
): boolean {
  return podeVerInscricao(usuario, inscricao, pedido, clubeIdDoEvento);
}
