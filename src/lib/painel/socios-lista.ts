import { limparCpf, validarCpf } from '@/lib/regras/cpf';

/**
 * Lê a lista de sócios colada da planilha: uma pessoa por linha, CPF e nome
 * separados por ponto e vírgula, vírgula ou tabulação (como vem do Excel/Google Planilhas).
 * Também aceita só o CPF. Linhas com CPF inválido voltam em `invalidas`.
 */
/** Tamanho máximo do texto colado (cerca de 5.000 linhas com CPF e nome). */
export const LIMITE_TEXTO_SOCIOS = 500_000;

export function lerListaSocios(texto: string): { validos: Array<{ cpf: string; nome: string | null }>; invalidas: string[] } {
  const validos = new Map<string, string | null>();
  const invalidas: string[] = [];
  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) continue;
    const partes = linha.split(/[;\t]|,(?=\s*\D)/).map((p) => p.trim()).filter(Boolean);
    const idxCpf = partes.findIndex((p) => limparCpf(p).length === 11);
    const cpf = idxCpf >= 0 ? limparCpf(partes[idxCpf]) : '';
    if (!validarCpf(cpf)) {
      if (!/^cpf\b/i.test(linha) && invalidas.length < 100) invalidas.push(linha.slice(0, 100)); // ignora o cabeçalho "CPF;Nome"
      continue;
    }
    // Nome com no máximo 200 caracteres (um nome gigante não serve para nada e enche o banco).
    const nome = partes.filter((_, i) => i !== idxCpf).join(' ').trim().slice(0, 200) || null;
    validos.set(cpf, nome);
  }
  return { validos: [...validos].map(([cpf, nome]) => ({ cpf, nome })), invalidas };
}
