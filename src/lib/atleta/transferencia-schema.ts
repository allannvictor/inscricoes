import { z } from 'zod';

/** Dados do novo participante numa transferência (validados no servidor). */
export const novoParticipanteSchema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome completo').max(200),
  cpf: z.string().trim().max(20, 'CPF inválido.'),
  email: z.string().trim().max(254, 'E-mail longo demais.').email('Informe um e-mail válido (o novo participante recebe a confirmação)'),
  nascimento: z.string().trim().max(10, 'Data de nascimento inválida.'),
  // Obrigatório só em evento com categoria.
  sexo: z.union([z.enum(['F', 'M']), z.literal('')]).optional(),
  telefone: z.string().trim().max(20, 'WhatsApp inválido.').refine((v) => v.replace(/\D/g, '').length >= 10, 'Informe o WhatsApp com DDD'),
  camisa: z.string().trim().max(5, 'Tamanho de camisa inválido.').optional(),
  contatoEmergencia: z.string().trim().min(3, 'Informe o contato de emergência').max(200),
});

export type NovoParticipante = z.input<typeof novoParticipanteSchema>;
