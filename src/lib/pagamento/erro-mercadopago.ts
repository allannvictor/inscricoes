/**
 * Resumo de uma resposta de erro do Mercado Pago para o log, SEM dados pessoais.
 * A resposta inteira pode repetir o e-mail, o nome e o CPF de quem paga, por isso só guardamos:
 * - o status HTTP;
 * - o código do erro (ex.: "failed");
 * - o motivo técnico do pagamento ("status_detail", ex.: "rejected_by_issuer");
 * - um trecho curto da mensagem técnica, com e-mails e números longos apagados.
 * Motivo: um 402 da API de Orders só dizia "Mercado Pago 402", sem a causa (teste do Allan no hml, 14/11/2026).
 */

type Qualquer = Record<string, unknown>;
const obj = (v: unknown): Qualquer => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Qualquer) : {});
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const texto = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');

/** Apaga e-mails, números com 6 dígitos ou mais (CPF, telefone, ids) e caracteres de controle. */
export function limparTextoTecnico(valor: string, max = 120): string {
  return valor
    .replace(/[^\s@]+@[^\s@]+/g, '[e-mail]')
    .replace(/\d[\d.\-/ ]{4,}\d/g, (m) => (m.replace(/\D/g, '').length >= 6 ? '[número]' : m))
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function resumoErroMercadoPago(status: number, corpoBruto: unknown): string {
  const corpo = obj(corpoBruto);
  const erro = obj(lista(corpo.errors)[0]);
  const codigo = texto(erro.code) || texto(corpo.error) || texto(corpo.code);
  const mensagem = texto(erro.message) || texto(corpo.message);
  const detalhes = lista(erro.details).map(texto).filter(Boolean).join('; ');
  // No 402 da API de Orders, a order vem em "data" (ou na raiz) com o motivo em transactions.payments[].status_detail.
  const order = Object.keys(obj(corpo.data)).length ? obj(corpo.data) : corpo;
  const pagamento = obj(lista(obj(order.transactions).payments)[0]);
  const partes = [
    `status=${status}`,
    codigo && `codigo=${limparTextoTecnico(codigo, 60)}`,
    texto(order.status_detail) && `order=${limparTextoTecnico(texto(order.status_detail), 60)}`,
    texto(pagamento.status) && `pagamento=${limparTextoTecnico(texto(pagamento.status), 40)}`,
    texto(pagamento.status_detail) && `motivo=${limparTextoTecnico(texto(pagamento.status_detail), 60)}`,
    mensagem && `mensagem=${limparTextoTecnico(mensagem)}`,
    detalhes && `detalhes=${limparTextoTecnico(detalhes)}`,
  ];
  return partes.filter(Boolean).join(' ');
}
