/**
 * Destino depois do login (parâmetro "voltar"): só caminhos DENTRO do site.
 * O navegador trata "\" como "/" e ignora tabulações e quebras de linha, então "/\site.com" e "/\t/site.com"
 * levariam para outro site. Por isso conferimos o resultado como o navegador faria, e não só o começo do texto.
 */
const BASE = 'https://inscricoesfast.invalid';

export function destinoInterno(valor: string | null | undefined, padrao = '/'): string {
  if (!valor || typeof valor !== 'string' || valor.length > 500) return padrao;
  if (!valor.startsWith('/') || valor.startsWith('//')) return padrao;
  if (/[\\\u0000-\u001f\u007f]/.test(valor)) return padrao;
  try {
    const url = new URL(valor, BASE);
    if (url.origin !== BASE) return padrao;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return padrao;
  }
}
