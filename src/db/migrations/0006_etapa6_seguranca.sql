-- Escrita com IF NOT EXISTS de propósito: o banco da homologação pode ter recebido uma versão anterior
-- destas mudanças pelo deploy de prévia (14/11/2026). Assim ela aplica em qualquer estado.
CREATE TABLE IF NOT EXISTS "limites_uso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chave" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "codigos_login" ADD COLUMN IF NOT EXISTS "ip_hash" text;--> statement-breakpoint
ALTER TABLE "tentativas_senha" ADD COLUMN IF NOT EXISTS "ip_hash" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "limites_uso_chave" ON "limites_uso" USING btree ("chave","criado_em");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "codigos_login_ip_idx" ON "codigos_login" USING btree ("ip_hash","criado_em");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tentativas_senha_ip" ON "tentativas_senha" USING btree ("ip_hash","criado_em");