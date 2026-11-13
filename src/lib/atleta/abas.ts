/**
 * Organiza "Minhas inscrições" em abas e agrupa por prova.
 * - inscrito: provas que ainda vão acontecer, confirmadas ou aguardando Pix.
 *   Provas com Pix pendente vêm primeiro; depois, da mais próxima para a mais distante.
 * - cancelados: inscrições canceladas, de qualquer data, da mais recente para a mais antiga.
 * - passadas: provas que já aconteceram com inscrição confirmada, da mais recente para a mais antiga.
 */

export const ABAS = ['inscrito', 'cancelados', 'passadas'] as const;
export type Aba = (typeof ABAS)[number];

export const NOME_ABA: Record<Aba, string> = {
  inscrito: 'Inscrito',
  cancelados: 'Cancelados',
  passadas: 'Passadas',
};

export const ABA_VAZIA: Record<Aba, string> = {
  inscrito: 'Nenhuma inscrição em prova futura.',
  cancelados: 'Nenhuma inscrição cancelada.',
  passadas: 'Nenhuma prova passada.',
};

/** O mínimo que a separação precisa saber de cada inscrição. */
export interface ItemAba {
  inscricao: { id: string; status: string };
  evento: { id: string; dataHora: Date };
}

export interface GrupoProva<T extends ItemAba> {
  evento: T['evento'];
  itens: T[];
}

export function abaValida(valor: unknown): Aba {
  return ABAS.includes(valor as Aba) ? (valor as Aba) : 'inscrito';
}

export function abaDaInscricao(item: ItemAba, agora: Date): Aba | null {
  const { status } = item.inscricao;
  if (status === 'cancelada') return 'cancelados';
  const passou = item.evento.dataHora < agora;
  if (!passou && (status === 'confirmada' || status === 'pendente')) return 'inscrito';
  if (passou && status === 'confirmada') return 'passadas';
  return null; // ex.: Pix pendente de prova que já passou
}

function agrupar<T extends ItemAba>(itens: T[]): GrupoProva<T>[] {
  const porEvento = new Map<string, GrupoProva<T>>();
  for (const item of itens) {
    const grupo: GrupoProva<T> = porEvento.get(item.evento.id) ?? { evento: item.evento, itens: [] as T[] };
    grupo.itens.push(item);
    porEvento.set(item.evento.id, grupo);
  }
  return [...porEvento.values()];
}

const temPendente = (g: GrupoProva<ItemAba>) => g.itens.some((i) => i.inscricao.status === 'pendente');

/** Separa as inscrições nas três abas, já agrupadas por prova e ordenadas. */
export function separarEmAbas<T extends ItemAba>(itens: T[], agora: Date): Record<Aba, GrupoProva<T>[]> {
  const porAba: Record<Aba, T[]> = { inscrito: [], cancelados: [], passadas: [] };
  for (const item of itens) {
    const aba = abaDaInscricao(item, agora);
    if (aba) porAba[aba].push(item);
  }

  const data = (g: GrupoProva<T>) => g.evento.dataHora.getTime();
  const inscrito = agrupar(porAba.inscrito).sort((a, b) => Number(temPendente(b)) - Number(temPendente(a)) || data(a) - data(b));
  for (const g of inscrito) g.itens.sort((a, b) => Number(b.inscricao.status === 'pendente') - Number(a.inscricao.status === 'pendente'));

  return {
    inscrito,
    cancelados: agrupar(porAba.cancelados).sort((a, b) => data(b) - data(a)),
    passadas: agrupar(porAba.passadas).sort((a, b) => data(b) - data(a)),
  };
}
