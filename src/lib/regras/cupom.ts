import type { MotivoDesconto } from './preco';

export interface CupomRegra {
  tipo: 'percentual' | 'valor';
  valor: number; // % ou centavos
}

export interface ItemPreco {
  valor: number;
  motivo: MotivoDesconto;
}

/**
 * Aplica o cupom só em quem paga preço cheio (motivo null).
 * Cupom de valor fixo é dividido entre esses participantes, sem deixar ninguém negativo.
 * Devolve os itens já com o desconto e o total descontado.
 */
export function aplicarCupom<T extends ItemPreco>(itens: T[], cupom: CupomRegra | null): { itens: T[]; desconto: number } {
  if (!cupom) return { itens, desconto: 0 };
  const elegiveis = itens.map((it, i) => ({ it, i })).filter(({ it }) => it.motivo === null && it.valor > 0);
  const base = elegiveis.reduce((s, { it }) => s + it.valor, 0);
  if (base === 0) return { itens, desconto: 0 };

  let descontoTotal =
    cupom.tipo === 'percentual'
      ? Math.round((base * Math.min(Math.max(cupom.valor, 0), 100)) / 100)
      : Math.min(Math.max(cupom.valor, 0), base);
  if (descontoTotal === 0) return { itens, desconto: 0 };

  const resultado = itens.map((it) => ({ ...it }));
  let restante = descontoTotal;
  elegiveis.forEach(({ it, i }, k) => {
    const parte = k === elegiveis.length - 1 ? restante : Math.min(it.valor, Math.round((descontoTotal * it.valor) / base));
    const aplicado = Math.min(parte, it.valor);
    resultado[i].valor = it.valor - aplicado;
    if (aplicado > 0) resultado[i].motivo = 'cupom';
    restante -= aplicado;
  });
  descontoTotal -= restante; // se sobrou algo por arredondamento, não foi descontado
  return { itens: resultado, desconto: descontoTotal };
}
