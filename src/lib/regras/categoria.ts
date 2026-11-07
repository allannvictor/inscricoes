import { idadeEm } from './datas';

/** Faixas etárias usadas nos simulados. A idade conta no dia da prova. */
export const FAIXAS: ReadonlyArray<{ min: number; max: number; nome: string }> = [
  { min: 0, max: 17, nome: 'até 17' },
  { min: 18, max: 29, nome: '18–29' },
  { min: 30, max: 39, nome: '30–39' },
  { min: 40, max: 49, nome: '40–49' },
  { min: 50, max: 59, nome: '50–59' },
  { min: 60, max: 200, nome: '60+' },
];

export type Sexo = 'F' | 'M';

export function categoria(nascimento: string, sexo: Sexo, dataEvento: string): string {
  const idade = idadeEm(nascimento, dataEvento);
  const faixa = FAIXAS.find((f) => idade >= f.min && idade <= f.max) ?? FAIXAS[0];
  return `${sexo === 'F' ? 'Feminino' : 'Masculino'} ${faixa.nome}`;
}
