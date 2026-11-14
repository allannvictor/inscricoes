import { idadeEm } from './datas';

export type MotivoDesconto = 'socio' | 'meia60' | 'cupom' | null;

export const IDADE_MEIA = 60;

export interface DistanciaPreco {
  precoCentavos: number;
  precoSocioCentavos: number | null;
}

export interface PrecoCalculado {
  valor: number; // centavos
  motivo: MotivoDesconto;
}

/**
 * Preço de um participante numa distância.
 * Descontos NÃO acumulam: vale o menor entre preço cheio, preço de sócio e meia (60+).
 * - Sócio: só se o evento tiver preço de sócio ligado e o CPF estiver na lista do clube.
 * - Meia: Estatuto da Pessoa Idosa (60 anos ou mais na data da inscrição). Metade do preço cheio, arredondada para baixo.
 */
export function precoParticipante(
  distancia: DistanciaPreco,
  opcoes: { precoSocioAtivo: boolean; ehSocio: boolean; nascimento: string; dataInscricao: string },
): PrecoCalculado {
  let melhor: PrecoCalculado = { valor: distancia.precoCentavos, motivo: null };
  if (opcoes.precoSocioAtivo && opcoes.ehSocio && distancia.precoSocioCentavos != null && distancia.precoSocioCentavos < melhor.valor) {
    melhor = { valor: distancia.precoSocioCentavos, motivo: 'socio' };
  }
  if (ehIdoso(opcoes.nascimento, opcoes.dataInscricao)) {
    const meia = Math.floor(distancia.precoCentavos / 2);
    if (meia < melhor.valor) melhor = { valor: meia, motivo: 'meia60' };
  }
  return melhor;
}

export function ehIdoso(nascimento: string, dataInscricao: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(nascimento) && idadeEm(nascimento, dataInscricao) >= IDADE_MEIA;
}

export function formatarReais(centavos: number): string {
  return 'R$ ' + (centavos / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export const NOME_MOTIVO: Record<Exclude<MotivoDesconto, null>, string> = {
  socio: 'sócio',
  meia60: 'meia 60+',
  cupom: 'cupom',
};

/** Cada clube dá o próprio nome ao preço especial (ex.: "Aluno CF"). Vazio: "Sócio". */
export const LIMITE_NOME_PRECO_ESPECIAL = 20;
export function nomePrecoEspecial(nomeDoClube: string | null | undefined): string {
  return nomeDoClube?.trim() || 'Sócio';
}

/** Nome do desconto para mostrar, com o nome do preço especial do clube. */
export function nomeMotivo(motivo: Exclude<MotivoDesconto, null>, nomeDoClube: string | null | undefined): string {
  return motivo === 'socio' ? nomePrecoEspecial(nomeDoClube) : NOME_MOTIVO[motivo];
}
