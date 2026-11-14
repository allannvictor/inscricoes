/**
 * Parâmetros da URL (`?erro=…`, `?busca=…`) chegam como texto, lista (`?busca=a&busca=b`) ou nada.
 * Sexta varredura de segurança (14/11/2026): lista virava TypeError, e `?erro=constructor` achava
 * uma função herdada do objeto de mensagens. As duas davam erro 500.
 */

/** Só aceita texto: lista ou qualquer outra coisa vira `undefined`. */
export function textoDoParametro(valor: unknown): string | undefined {
  return typeof valor === 'string' ? valor : undefined;
}

/** Mensagem de um mapa pela chave, só se a chave for do PRÓPRIO mapa (nada de `constructor`, `toString`…). */
export function mensagemDoMapa(mapa: Record<string, string>, chave: unknown): string | undefined {
  return typeof chave === 'string' && Object.hasOwn(mapa, chave) ? mapa[chave] : undefined;
}

/**
 * JSON recebido como objeto. O que não é objeto (`null`, número, texto, lista) vira {}.
 * Ex.: o webhook do Mercado Pago com corpo `null` dava erro 500 antes de conferir a assinatura.
 */
export function comoObjeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};
}

/**
 * Cookie temporário em JSON (OAuth do Mercado Pago e do Google) com os campos pedidos, todos em texto.
 * Cookie adulterado (`5`, `"x"`, `{}`, `{"state":1}`) vira null, em vez de erro 500 (sétima varredura, 14/11/2026).
 */
export function lerCookieJson<K extends string>(bruto: string | undefined, campos: readonly K[]): Record<K, string> | null {
  if (!bruto || bruto.length > 4000) return null;
  let valor: unknown;
  try {
    valor = JSON.parse(bruto);
  } catch {
    return null;
  }
  const obj = comoObjeto(valor);
  for (const c of campos) if (typeof obj[c] !== 'string' || !obj[c]) return null;
  return Object.fromEntries(campos.map((c) => [c, obj[c] as string])) as Record<K, string>;
}
