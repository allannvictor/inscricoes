/**
 * Cor de destaque de cada clube (botões, ícones, links).
 * - Sem cor escolhida, vale a cor padrão da plataforma (azul neutro).
 * - O texto do botão é branco ou quase preto, o que tiver mais contraste.
 * - Para texto e ícones sobre fundo branco, a cor é escurecida até ter contraste de 4,5:1,
 *   assim um amarelo claro continua legível.
 */

export const COR_PADRAO = '#2563EB';
const TINTA = '#1B1F24';
const BRANCO = '#FFFFFF';

/** Aceita #RGB ou #RRGGBB (com ou sem #). Devolve #RRGGBB em maiúsculas, ou null se inválida. */
export function normalizarCor(valor: string | null | undefined): string | null {
  const v = (valor ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(v)) return `#${v.split('').map((c) => c + c).join('')}`.toUpperCase();
  if (/^[0-9a-f]{6}$/i.test(v)) return `#${v}`.toUpperCase();
  return null;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** Luminância relativa (WCAG). */
function luminancia(cor: string): number {
  const [r, g, b] = rgb(cor).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste entre duas cores (1 a 21). */
export function contraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (la + 0.05) / (lb + 0.05);
}

export interface TemaClube {
  /** Fundo do botão principal e marcações. */
  acao: string;
  /** Texto sobre o botão principal. */
  acaoTexto: string;
  /** Texto, links e ícones sobre fundo branco. */
  acaoTinta: string;
}

export function temaDoClube(corDoClube: string | null | undefined): TemaClube {
  const acao = normalizarCor(corDoClube) ?? COR_PADRAO;
  const acaoTexto = contraste(acao, BRANCO) >= contraste(acao, TINTA) ? BRANCO : TINTA;
  let tinta = rgb(acao);
  for (let i = 0; i < 20 && contraste(hex(tinta), BRANCO) < 4.5; i++) {
    tinta = tinta.map((c) => c * 0.9) as [number, number, number];
  }
  return { acao, acaoTexto, acaoTinta: hex(tinta) };
}

/** Variáveis CSS para aplicar o tema num trecho da página. */
export function estiloDoTema(tema: TemaClube): Record<string, string> {
  return { '--color-acao': tema.acao, '--color-acao-texto': tema.acaoTexto, '--color-acao-tinta': tema.acaoTinta };
}
