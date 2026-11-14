import { z } from 'zod';

const texto = (min: number, msg: string) => z.string().trim().min(min, msg).max(200);

export const participanteSchema = z.object({
  distanciaId: z.string().uuid('Escolha a distância'),
  nome: texto(3, 'Informe o nome completo'),
  // Tamanhos máximos em TODOS os campos: sem eles, dava para gravar megabytes num campo e encher o banco
  // (terceira varredura de segurança, 14/11/2026).
  cpf: z.string().trim().max(20, 'CPF inválido'),
  email: z.union([z.literal(''), z.string().trim().max(254, 'E-mail longo demais').email('E-mail inválido')]).optional(),
  nascimento: z.string().trim().max(10, 'Data de nascimento inválida'),
  // Obrigatório só em evento com categoria (conferido em criarPedido).
  sexo: z.union([z.enum(['F', 'M']), z.literal('')]).optional(),
  telefone: z.string().trim().max(20, 'WhatsApp inválido').refine((v) => v.replace(/\D/g, '').length >= 10, 'Informe o WhatsApp com DDD'),
  camisa: z.string().trim().max(5, 'Tamanho de camisa inválido').optional(),
  contatoEmergencia: texto(3, 'Informe o contato de emergência'),
});

export const pedidoSchema = z.object({
  eventoId: z.string().uuid(),
  cupom: z.string().trim().max(40).optional(),
  aceite: z.literal(true, { message: 'Aceite o regulamento' }),
  participantes: z.array(participanteSchema).min(1, 'Adicione ao menos um participante').max(10, 'Máximo de 10 participantes por pedido'),
});

export type PedidoEntrada = z.infer<typeof pedidoSchema>;
export type ParticipanteForm = z.infer<typeof participanteSchema>;
