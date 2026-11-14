import { z } from 'zod';
import { semCaractereNulo } from '@/lib/regras/texto';
import { MAX_PARTICIPANTES_POR_PEDIDO } from '@/lib/regras/limites-pedido';

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
}).superRefine(semCaractereNulo);

export const pedidoSchema = z.object({
  eventoId: z.string().uuid(),
  // Mesmo formato dos códigos criados no painel (letras, números, - e _). O caractere nulo passava
  // e dava erro no banco (sexta varredura de segurança, 14/11/2026).
  cupom: z.string().trim().regex(/^[A-Za-z0-9_-]{0,30}$/, 'Cupom não encontrado.').optional(),
  aceite: z.literal(true, { message: 'Aceite o regulamento' }),
  participantes: z.array(participanteSchema).min(1, 'Adicione ao menos um participante').max(MAX_PARTICIPANTES_POR_PEDIDO, `Máximo de ${MAX_PARTICIPANTES_POR_PEDIDO} participantes por pedido (você e mais ${MAX_PARTICIPANTES_POR_PEDIDO - 1}). Para inscrever mais pessoas, faça outro pedido.`),
}).superRefine(semCaractereNulo);

export type PedidoEntrada = z.infer<typeof pedidoSchema>;
export type ParticipanteForm = z.infer<typeof participanteSchema>;
