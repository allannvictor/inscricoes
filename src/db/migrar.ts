/** Aplica as migrações pendentes: `npm run db:migrate`. */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL não configurada.');
const conexao = postgres(url, { max: 1 });
await migrate(drizzle(conexao), { migrationsFolder: './src/db/migrations' });
await conexao.end();
console.log('Migrações aplicadas.');
