/**
 * Pedidos aguardando Pix seguram vagas por 30 minutos. Sem limite, uma conta poderia criar pedidos sem parar
 * e esgotar um evento (ou bloquear o CPF de alguém). Achado da varredura de segurança de 14/11/2026.
 */
export const MAX_PENDENTES_POR_EVENTO = 2;
export const MAX_PENDENTES_POR_CONTA = 5;
/** Pessoas aguardando Pix por conta no mesmo evento, contando o pedido novo (segunda varredura, 14/11/2026). */
export const MAX_PESSOAS_PENDENTES_POR_EVENTO = 10;

export function bloqueioDePedido(pendentesNoEvento: number, pendentesNaConta: number, pessoasNoEventoComONovo = 0): string | null {
  if (pendentesNoEvento >= MAX_PENDENTES_POR_EVENTO) {
    return 'Você já tem pedidos aguardando o Pix neste evento. Pague ou espere o Pix vencer (30 minutos) antes de fazer outro.';
  }
  if (pessoasNoEventoComONovo > MAX_PESSOAS_PENDENTES_POR_EVENTO) {
    return `Você já tem muitas pessoas aguardando o Pix neste evento (no máximo ${MAX_PESSOAS_PENDENTES_POR_EVENTO}). Pague os pedidos abertos antes de inscrever mais gente.`;
  }
  if (pendentesNaConta >= MAX_PENDENTES_POR_CONTA) {
    return 'Você tem muitos pedidos aguardando o Pix. Pague ou espere eles vencerem (30 minutos).';
  }
  return null;
}
