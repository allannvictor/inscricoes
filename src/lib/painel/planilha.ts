/**
 * Planilha CSV que abre direto no Excel em português:
 * separador ";", BOM UTF-8 (acentos corretos) e valores com aspas quando preciso.
 */
export function gerarCsv(cabecalho: string[], linhas: Array<Array<string | number | null | undefined>>): string {
  const celula = (v: string | number | null | undefined) => {
    if (v == null) return '';
    let s = String(v);
    // Evita que o Excel interprete o conteúdo como fórmula.
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const corpo = [cabecalho, ...linhas].map((l) => l.map(celula).join(';')).join('\r\n');
  return '﻿' + corpo + '\r\n';
}

export function centavosParaPlanilha(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}
