import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export function createDbClient(connectionString: string) {
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(client, { schema });
}

export type DbClient = ReturnType<typeof createDbClient>;
export type TxClient = Parameters<Parameters<DbClient['transaction']>[0]>[0];
export type DbOrTx = DbClient | TxClient;

export async function closeDbClient(db: DbClient): Promise<void> {
  const client = (db as unknown as { $client?: postgres.Sql }).$client;
  if (client?.end) {
    await client.end();
  }
}
