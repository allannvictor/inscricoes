/**
 * Tabelas do banco (Postgres). Valores em dinheiro são sempre em CENTAVOS (inteiros).
 * Depois de mudar este arquivo: `npm run db:generate` (cria a migração) e `npm run db:migrate`.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const criadoEm = () => timestamp('criado_em', { withTimezone: true }).notNull().defaultNow();

export const clubes = pgTable('clubes', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  slug: text('slug').notNull().unique(),
  fotoUrl: text('foto_url'),
  whatsapp: text('whatsapp'),
  instagram: text('instagram'),
  email: text('email'),
  // Conta Mercado Pago conectada (OAuth, etapa 2). Na etapa 1 usamos MP_ACCESS_TOKEN do ambiente.
  mpAccessToken: text('mp_access_token'),
  mpRefreshToken: text('mp_refresh_token'),
  mpUserId: text('mp_user_id'),
  mpConectado: boolean('mp_conectado').notNull().default(false),
  // Comissão da plataforma (etapa 6). 'nenhuma' | 'percentual' | 'fixa'
  comissaoTipo: text('comissao_tipo').notNull().default('nenhuma'),
  comissaoValor: integer('comissao_valor').notNull().default(0),
  criadoEm: criadoEm(),
});

export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  nome: text('nome'),
  cpf: text('cpf'),
  nascimento: date('nascimento'),
  sexo: text('sexo'), // 'F' | 'M'
  telefone: text('telefone'),
  camisa: text('camisa'),
  contatoEmergencia: text('contato_emergencia'),
  // Reservado para login com senha no futuro (hoje o login é só por código no e-mail).
  senhaHash: text('senha_hash'),
  criadoEm: criadoEm(),
});

export const organizadores = pgTable(
  'organizadores',
  {
    clubeId: uuid('clube_id').notNull().references(() => clubes.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
    papel: text('papel').notNull().default('admin'),
  },
  (t) => [primaryKey({ columns: [t.clubeId, t.usuarioId] })],
);

export const codigosLogin = pgTable(
  'codigos_login',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    codigoHash: text('codigo_hash').notNull(),
    expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
    tentativas: integer('tentativas').notNull().default(0),
    usadoEm: timestamp('usado_em', { withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [index('codigos_login_email_idx').on(t.email, t.criadoEm)],
);

export const sessoes = pgTable('sessoes', {
  // Guardamos só o hash do token; o token em si fica apenas no cookie do navegador.
  tokenHash: text('token_hash').primaryKey(),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
  criadoEm: criadoEm(),
});

export const eventos = pgTable('eventos', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubeId: uuid('clube_id').notNull().references(() => clubes.id),
  slug: text('slug').notNull().unique(),
  nome: text('nome').notNull(),
  dataHora: timestamp('data_hora', { withTimezone: true }).notNull(),
  local: text('local').notNull(),
  descricao: text('descricao'),
  capaUrl: text('capa_url'),
  regulamentoUrl: text('regulamento_url'),
  inscricoesAte: timestamp('inscricoes_ate', { withTimezone: true }).notNull(),
  transferenciaAte: timestamp('transferencia_ate', { withTimezone: true }),
  status: text('status').notNull().default('rascunho'), // 'rascunho' | 'publicado' | 'encerrado'
  precoSocioAtivo: boolean('preco_socio_ativo').notNull().default(false),
  pedeCamisa: boolean('pede_camisa').notNull().default(true),
  usaCategoria: boolean('usa_categoria').notNull().default(true),
  taxaPagaPor: text('taxa_paga_por').notNull().default('clube'), // 'clube' | 'atleta'
  criadoEm: criadoEm(),
});

export const distancias = pgTable('distancias', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventoId: uuid('evento_id').notNull().references(() => eventos.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  precoCentavos: integer('preco_centavos').notNull(),
  precoSocioCentavos: integer('preco_socio_centavos'),
  vagas: integer('vagas'), // null = sem limite
  ordem: integer('ordem').notNull().default(0),
});

export const socios = pgTable(
  'socios',
  {
    clubeId: uuid('clube_id').notNull().references(() => clubes.id, { onDelete: 'cascade' }),
    cpf: text('cpf').notNull(), // só dígitos
    nome: text('nome'),
  },
  (t) => [primaryKey({ columns: [t.clubeId, t.cpf] })],
);

export const cupons = pgTable(
  'cupons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventoId: uuid('evento_id').notNull().references(() => eventos.id, { onDelete: 'cascade' }),
    codigo: text('codigo').notNull(), // sempre MAIÚSCULO
    tipo: text('tipo').notNull(), // 'percentual' | 'valor'
    valor: integer('valor').notNull(), // % (ex.: 10) ou centavos (ex.: 1000)
    limite: integer('limite'), // null = sem limite de usos
    ativo: boolean('ativo').notNull().default(true),
  },
  (t) => [uniqueIndex('cupons_evento_codigo_idx').on(t.eventoId, t.codigo)],
);

export const pedidos = pgTable(
  'pedidos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventoId: uuid('evento_id').notNull().references(() => eventos.id),
    compradorId: uuid('comprador_id').notNull().references(() => usuarios.id),
    // 'pendente' | 'pago' | 'expirado' | 'cancelado' | 'pago_conflito'
    status: text('status').notNull().default('pendente'),
    subtotalCentavos: integer('subtotal_centavos').notNull(),
    descontoCentavos: integer('desconto_centavos').notNull().default(0),
    totalCentavos: integer('total_centavos').notNull(),
    cupomId: uuid('cupom_id').references(() => cupons.id),
    taxaPlataformaCentavos: integer('taxa_plataforma_centavos').notNull().default(0),
    taxaGatewayCentavos: integer('taxa_gateway_centavos'),
    metodo: text('metodo').notNull().default('pix'),
    provedor: text('provedor').notNull(), // 'mercadopago' | 'simulado'
    pagamentoId: text('pagamento_id'),
    pixCopiaECola: text('pix_copia_e_cola'),
    pixQrBase64: text('pix_qr_base64'),
    expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
    pagoEm: timestamp('pago_em', { withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [
    index('pedidos_evento_status_idx').on(t.eventoId, t.status),
    index('pedidos_comprador_idx').on(t.compradorId),
    index('pedidos_pagamento_idx').on(t.pagamentoId),
  ],
);

export const inscricoes = pgTable(
  'inscricoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pedidoId: uuid('pedido_id').notNull().references(() => pedidos.id),
    eventoId: uuid('evento_id').notNull().references(() => eventos.id),
    distanciaId: uuid('distancia_id').notNull().references(() => distancias.id),
    nome: text('nome').notNull(),
    cpf: text('cpf').notNull(), // só dígitos
    email: text('email'),
    nascimento: date('nascimento').notNull(),
    sexo: text('sexo').notNull(),
    telefone: text('telefone'),
    camisa: text('camisa'),
    contatoEmergencia: text('contato_emergencia'),
    categoria: text('categoria'),
    precoCentavos: integer('preco_centavos').notNull(),
    motivoDesconto: text('motivo_desconto'), // null | 'socio' | 'meia60' | 'cupom'
    // 'pendente' | 'confirmada' | 'expirada' | 'cancelada'
    status: text('status').notNull().default('pendente'),
    numero: integer('numero'),
    canceladaEm: timestamp('cancelada_em', { withTimezone: true }),
    canceladaPor: uuid('cancelada_por').references(() => usuarios.id),
    criadoEm: criadoEm(),
  },
  (t) => [
    // Um CPF só pode ter uma inscrição ativa por evento.
    uniqueIndex('inscricoes_evento_cpf_ativa_idx')
      .on(t.eventoId, t.cpf)
      .where(sql`status in ('pendente', 'confirmada')`),
    index('inscricoes_pedido_idx').on(t.pedidoId),
    index('inscricoes_distancia_status_idx').on(t.distanciaId, t.status),
  ],
);

export const transferencias = pgTable('transferencias', {
  id: uuid('id').primaryKey().defaultRandom(),
  inscricaoId: uuid('inscricao_id').notNull().references(() => inscricoes.id),
  dadosAnteriores: jsonb('dados_anteriores').notNull(),
  feitaPor: uuid('feita_por').references(() => usuarios.id),
  criadoEm: criadoEm(),
});

export type Clube = typeof clubes.$inferSelect;
export type Usuario = typeof usuarios.$inferSelect;
export type Evento = typeof eventos.$inferSelect;
export type Distancia = typeof distancias.$inferSelect;
export type Cupom = typeof cupons.$inferSelect;
export type Pedido = typeof pedidos.$inferSelect;
export type Inscricao = typeof inscricoes.$inferSelect;
