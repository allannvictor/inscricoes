ALTER TABLE "inscricoes" ADD COLUMN "cancelada_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "cancelada_por" uuid;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_cancelada_por_usuarios_id_fk" FOREIGN KEY ("cancelada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;