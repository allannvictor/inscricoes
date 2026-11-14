import { z } from 'zod';
import { FUSO } from '@/lib/regras/datas';

/** Formulário de criar/editar evento. Datas chegam como no <input> e são do fuso de Brasília. */

const reais = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s|R\$/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
  // No máximo R$ 9.999.999,99 (números enormes não cabem no banco e davam erro 500).
  .refine((v) => v === '' || /^\d{1,7}(\.\d{1,2})?$/.test(v), 'Valor inválido');

export const distanciaFormSchema = z.object({
  id: z.string().optional(),
  nome: z.string().trim().min(1, 'Dê um nome para cada distância').max(40),
  preco: reais.refine((v) => v !== '', 'Informe o preço de cada distância'),
  precoSocio: reais,
  vagas: z.string().trim().refine((v) => v === '' || /^\d{1,6}$/.test(v), 'Vagas deve ser um número (até 999.999)'),
});

export const eventoFormSchema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome do evento').max(120),
  dataHora: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Informe data e hora da largada'),
  local: z.string().trim().min(2, 'Informe o local').max(200),
  descricao: z.string().trim().max(5000).optional().default(''),
  inscricoesAte: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe até quando vão as inscrições'),
  transferenciaAte: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).optional().default(''),
  precoSocioAtivo: z.boolean(),
  pedeCamisa: z.boolean(),
  usaCategoria: z.boolean(),
  distancias: z.array(distanciaFormSchema).min(1, 'Adicione ao menos uma distância').max(10),
});

export type EventoForm = z.input<typeof eventoFormSchema>;

/** "2026-12-13T05:30" (Brasília) → Date. O Brasil não tem horário de verão desde 2019. */
export function dataHoraBrasilia(valor: string): Date {
  return new Date(`${valor}:00-03:00`);
}

/** "2026-12-10" → fim do dia em Brasília. */
export function fimDoDiaBrasilia(valor: string): Date {
  return new Date(`${valor}T23:59:59-03:00`);
}

/** Date → "2026-12-13T05:30" para preencher o <input type="datetime-local">. */
export function paraInputDataHora(d: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function paraCentavos(valor: string): number {
  return Math.round(Number(valor) * 100);
}

/** Regras que dependem de mais de um campo. Devolve a lista de erros. */
export function conferirEvento(e: z.output<typeof eventoFormSchema>): string[] {
  const erros: string[] = [];
  const largada = dataHoraBrasilia(e.dataHora);
  if (fimDoDiaBrasilia(e.inscricoesAte) > largada) erros.push('As inscrições precisam terminar antes da largada.');
  if (e.transferenciaAte && fimDoDiaBrasilia(e.transferenciaAte) > largada) erros.push('O prazo de transferência precisa terminar antes da largada.');
  const nomes = e.distancias.map((d) => d.nome.toLowerCase());
  if (new Set(nomes).size !== nomes.length) erros.push('Há distâncias com o mesmo nome.');
  for (const d of e.distancias) {
    if (paraCentavos(d.preco) <= 0) erros.push(`${d.nome}: o preço precisa ser maior que zero.`);
    if (e.precoSocioAtivo && d.precoSocio !== '' && paraCentavos(d.precoSocio) > paraCentavos(d.preco)) {
      erros.push(`${d.nome}: o preço de sócio não pode ser maior que o preço normal.`);
    }
  }
  return erros;
}
