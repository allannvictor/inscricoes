/**
 * Quem pode ver o quê. Regras puras (sem banco) para serem testadas.
 * As páginas carregam os dados e perguntam aqui; se a resposta for "não", mostram 404.
 */

export interface UsuarioLogado {
  id: string;
  email: string;
  cpf: string | null;
  clubesOrganizados: string[]; // ids de clubes em que é organizador
}

export function ehOrganizadorDoClube(usuario: UsuarioLogado | null, clubeId: string): boolean {
  return !!usuario && usuario.clubesOrganizados.includes(clubeId);
}

/** Pedido: só o comprador ou um organizador do clube dono do evento. */
export function podeVerPedido(usuario: UsuarioLogado | null, pedido: { compradorId: string }, clubeIdDoEvento: string): boolean {
  if (!usuario) return false;
  return pedido.compradorId === usuario.id || ehOrganizadorDoClube(usuario, clubeIdDoEvento);
}

/** Inscrição: comprador, o próprio participante (pelo CPF ou e-mail da conta) ou organizador do clube. */
export function podeVerInscricao(
  usuario: UsuarioLogado | null,
  inscricao: { cpf: string; email: string | null },
  pedido: { compradorId: string },
  clubeIdDoEvento: string,
): boolean {
  if (!usuario) return false;
  if (pedido.compradorId === usuario.id || ehOrganizadorDoClube(usuario, clubeIdDoEvento)) return true;
  if (usuario.cpf && usuario.cpf === inscricao.cpf) return true;
  return !!inscricao.email && inscricao.email.toLowerCase() === usuario.email.toLowerCase();
}
