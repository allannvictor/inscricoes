/** Aplica as migrações pendentes: `npm run db:migrate`. */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Migrações preferem a conexão direta (sem pooler). Em prévias, usa só o banco de prévia.
const { urlDoBanco } = await import('./url');
const url = urlDoBanco({ semPooler: true });
const conexao = postgres(url, { max: 1 });
await migrate(drizzle(conexao), { migrationsFolder: './src/db/migrations' });
await conexao.end();
console.log('Migrações aplicadas.');
