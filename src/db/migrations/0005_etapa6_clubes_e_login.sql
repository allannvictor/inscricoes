CREATE TABLE "limites_uso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chave" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tentativas_senha" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"ip_hash" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clubes" ADD COLUMN "mp_token_expira_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clubes" ADD COLUMN "mp_conectado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "codigos_login" ADD COLUMN "ip_hash" text;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "google_id" text;--> statement-breakpoint
CREATE INDEX "limites_uso_chave" ON "limites_uso" USING btree ("chave","criado_em");--> statement-breakpoint
CREATE INDEX "tentativas_senha_email" ON "tentativas_senha" USING btree ("email","criado_em");--> statement-breakpoint
CREATE INDEX "tentativas_senha_ip" ON "tentativas_senha" USING btree ("ip_hash","criado_em");--> statement-breakpoint
CREATE INDEX "codigos_login_ip_idx" ON "codigos_login" USING btree ("ip_hash","criado_em");--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_google_id_unique" UNIQUE("google_id");