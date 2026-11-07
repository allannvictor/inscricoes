import { categoria, type Sexo } from './categoria';
import { aplicarCupom, type CupomRegra } from './cupom';
import { limparCpf } from './cpf';
import { precoParticipante, type DistanciaPreco, type MotivoDesconto } from './preco';

/**
 * Cálculo completo de um pedido. Usado na tela (para mostrar o total na hora)
 * e no servidor (que recalcula tudo e é quem vale).
 */

export interface ParticipanteEntrada {
  distanciaId: string;
  cpf: string;
  nascimento: string;
  sexo: Sexo | '';
}

export interface ItemPedido {
  distanciaId: string;
  valor: number;
  valorSemCupom: number;
  motivo: MotivoDesconto;
  categoria: string | null;
}

export interface ResultadoPedido {
  itens: ItemPedido[];
  subtotal: number; // já com sócio/meia, antes do cupom
  desconto: number; // cupom
  total: number;
}

export function calcularPedido(args: {
  participantes: ParticipanteEntrada[];
  distancias: Array<DistanciaPreco & { id: string }>;
  precoSocioAtivo: boolean;
  usaCategoria: boolean;
  cpfsSocios: ReadonlySet<string>;
  cupom: CupomRegra | null;
  dataInscricao: string; // AAAA-MM-DD
  dataEvento: string; // AAAA-MM-DD
}): ResultadoPedido {
  const base = args.participantes.map((p) => {
    const d = args.distancias.find((x) => x.id === p.distanciaId);
    const cat =
      args.usaCategoria && p.sexo && /^\d{4}-\d{2}-\d{2}$/.test(p.nascimento)
        ? categoria(p.nascimento, p.sexo, args.dataEvento)
        : null;
    if (!d) return { distanciaId: p.distanciaId, valor: 0, motivo: null as MotivoDesconto, categoria: cat };
    const preco = precoParticipante(d, {
      precoSocioAtivo: args.precoSocioAtivo,
      ehSocio: args.cpfsSocios.has(limparCpf(p.cpf)),
      nascimento: p.nascimento,
      dataInscricao: args.dataInscricao,
    });
    return { distanciaId: p.distanciaId, valor: preco.valor, motivo: preco.motivo, categoria: cat };
  });
  const subtotal = base.reduce((s, i) => s + i.valor, 0);
  const comCupom = aplicarCupom(base, args.cupom);
  const itens = comCupom.itens.map((it, i) => ({ ...it, valorSemCupom: base[i].valor }));
  return { itens, subtotal, desconto: comCupom.desconto, total: subtotal - comCupom.desconto };
}
