CREATE TABLE "tentativas_senha" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clubes" ADD COLUMN "mp_token_expira_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clubes" ADD COLUMN "mp_conectado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "google_id" text;--> statement-breakpoint
CREATE INDEX "tentativas_senha_email" ON "tentativas_senha" USING btree ("email","criado_em");--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_google_id_unique" UNIQUE("google_id");