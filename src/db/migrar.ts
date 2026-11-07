/** Aplica as migrações pendentes: `npm run db:migrate`. */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Migrações preferem a conexão direta (sem pooler), que a integração Neon da Vercel cria como DATABASE_URL_UNPOOLED.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL não configurada.');
const conexao = postgres(url, { max: 1 });
await migrate(drizzle(conexao), { migrationsFolder: './src/db/migrations' });
await conexao.end();
console.log('Migrações aplicadas.');
