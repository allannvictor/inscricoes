import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL não configurada (veja .env.example).');

// Reaproveita a conexão entre recargas do `next dev`.
const globalParaDb = globalThis as unknown as { conexaoPg?: ReturnType<typeof postgres> };
const conexao =
  globalParaDb.conexaoPg ??
  postgres(url, {
    max: process.env.NODE_ENV === 'production' ? 5 : 10,
    // Neon com pooler (PgBouncer) não suporta prepared statements nomeados.
    prepare: false,
  });
if (process.env.NODE_ENV !== 'production') globalParaDb.conexaoPg = conexao;

export const db = drizzle(conexao, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
