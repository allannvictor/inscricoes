import { validarCpf } from './cpf';
import { nascimentoValido } from './datas';

/**
 * O que falta nos dados de uma pessoa para ela poder ser inscrita num evento.
 * O sexo só é pedido em evento com categoria, e a camisa só quando o evento pede.
 * Usado na tela de inscrição (validação e "seus dados" em resumo).
 */

export interface DadosPessoa {
  nome: string;
  cpf: string;
  nascimento: string;
  sexo: string;
  telefone: string;
  camisa: string;
  contatoEmergencia: string;
}

export interface CamposDoEvento {
  usaCategoria: boolean;
  pedeCamisa: boolean;
}

export function faltasDaPessoa(p: DadosPessoa, evento: CamposDoEvento, hoje: string): string[] {
  const falta: string[] = [];
  if (!validarCpf(p.cpf)) falta.push('CPF válido');
  if (p.nome.trim().length < 3) falta.push('nome');
  if (!nascimentoValido(p.nascimento, hoje)) falta.push('nascimento');
  if (evento.usaCategoria && p.sexo !== 'F' && p.sexo !== 'M') falta.push('sexo');
  if (p.telefone.replace(/\D/g, '').length < 10) falta.push('WhatsApp com DDD');
  if (evento.pedeCamisa && !p.camisa) falta.push('camisa');
  if (p.contatoEmergencia.trim().length < 3) falta.push('contato de emergência');
  return falta;
}

/** Cadastro completo para este evento: a tela mostra "Seus dados" em resumo, sem pedir nada de novo. */
export function cadastroCompleto(p: DadosPessoa, evento: CamposDoEvento, hoje: string): boolean {
  return faltasDaPessoa(p, evento, hoje).length === 0;
}
