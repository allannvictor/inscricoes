CREATE TABLE "clubes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"slug" text NOT NULL,
	"foto_url" text,
	"whatsapp" text,
	"instagram" text,
	"email" text,
	"mp_access_token" text,
	"mp_refresh_token" text,
	"mp_user_id" text,
	"mp_conectado" boolean DEFAULT false NOT NULL,
	"comissao_tipo" text DEFAULT 'nenhuma' NOT NULL,
	"comissao_valor" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clubes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "codigos_login" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"codigo_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"usado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"tipo" text NOT NULL,
	"valor" integer NOT NULL,
	"limite" integer,
	"ativo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distancias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"preco_centavos" integer NOT NULL,
	"preco_socio_centavos" integer,
	"vagas" integer,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clube_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"data_hora" timestamp with time zone NOT NULL,
	"local" text NOT NULL,
	"descricao" text,
	"capa_url" text,
	"regulamento_url" text,
	"inscricoes_ate" timestamp with time zone NOT NULL,
	"transferencia_ate" timestamp with time zone,
	"status" text DEFAULT 'rascunho' NOT NULL,
	"preco_socio_ativo" boolean DEFAULT false NOT NULL,
	"pede_camisa" boolean DEFAULT true NOT NULL,
	"usa_categoria" boolean DEFAULT true NOT NULL,
	"taxa_paga_por" text DEFAULT 'clube' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "eventos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "inscricoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"evento_id" uuid NOT NULL,
	"distancia_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"cpf" text NOT NULL,
	"email" text,
	"nascimento" date NOT NULL,
	"sexo" text NOT NULL,
	"telefone" text,
	"camisa" text,
	"contato_emergencia" text,
	"categoria" text,
	"preco_centavos" integer NOT NULL,
	"motivo_desconto" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"numero" integer,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizadores" (
	"clube_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"papel" text DEFAULT 'admin' NOT NULL,
	CONSTRAINT "organizadores_clube_id_usuario_id_pk" PRIMARY KEY("clube_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" uuid NOT NULL,
	"comprador_id" uuid NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"subtotal_centavos" integer NOT NULL,
	"desconto_centavos" integer DEFAULT 0 NOT NULL,
	"total_centavos" integer NOT NULL,
	"cupom_id" uuid,
	"taxa_plataforma_centavos" integer DEFAULT 0 NOT NULL,
	"taxa_gateway_centavos" integer,
	"metodo" text DEFAULT 'pix' NOT NULL,
	"provedor" text NOT NULL,
	"pagamento_id" text,
	"pix_copia_e_cola" text,
	"pix_qr_base64" text,
	"expira_em" timestamp with time zone NOT NULL,
	"pago_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "socios" (
	"clube_id" uuid NOT NULL,
	"cpf" text NOT NULL,
	"nome" text,
	CONSTRAINT "socios_clube_id_cpf_pk" PRIMARY KEY("clube_id","cpf")
);
--> statement-breakpoint
CREATE TABLE "transferencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inscricao_id" uuid NOT NULL,
	"dados_anteriores" jsonb NOT NULL,
	"feita_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nome" text,
	"cpf" text,
	"nascimento" date,
	"sexo" text,
	"telefone" text,
	"camisa" text,
	"contato_emergencia" text,
	"senha_hash" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cupons" ADD CONSTRAINT "cupons_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distancias" ADD CONSTRAINT "distancias_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_clube_id_clubes_id_fk" FOREIGN KEY ("clube_id") REFERENCES "public"."clubes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_distancia_id_distancias_id_fk" FOREIGN KEY ("distancia_id") REFERENCES "public"."distancias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizadores" ADD CONSTRAINT "organizadores_clube_id_clubes_id_fk" FOREIGN KEY ("clube_id") REFERENCES "public"."clubes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizadores" ADD CONSTRAINT "organizadores_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_comprador_id_usuarios_id_fk" FOREIGN KEY ("comprador_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cupom_id_cupons_id_fk" FOREIGN KEY ("cupom_id") REFERENCES "public"."cupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "socios" ADD CONSTRAINT "socios_clube_id_clubes_id_fk" FOREIGN KEY ("clube_id") REFERENCES "public"."clubes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_feita_por_usuarios_id_fk" FOREIGN KEY ("feita_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "codigos_login_email_idx" ON "codigos_login" USING btree ("email","criado_em");--> statement-breakpoint
CREATE UNIQUE INDEX "cupons_evento_codigo_idx" ON "cupons" USING btree ("evento_id","codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "inscricoes_evento_cpf_ativa_idx" ON "inscricoes" USING btree ("evento_id","cpf") WHERE status in ('pendente', 'confirmada');--> statement-breakpoint
CREATE INDEX "inscricoes_pedido_idx" ON "inscricoes" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "inscricoes_distancia_status_idx" ON "inscricoes" USING btree ("distancia_id","status");--> statement-breakpoint
CREATE INDEX "pedidos_evento_status_idx" ON "pedidos" USING btree ("evento_id","status");--> statement-breakpoint
CREATE INDEX "pedidos_comprador_idx" ON "pedidos" USING btree ("comprador_id");